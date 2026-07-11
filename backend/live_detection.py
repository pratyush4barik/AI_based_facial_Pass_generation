import os
import sys
import threading
import warnings
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from insightface.app import FaceAnalysis

try:
    import torch
except ImportError:
    torch = None

MINIVISION_ROOT = Path(__file__).resolve().parent / "third_party" / "Silent-Face-Anti-Spoofing"
if MINIVISION_ROOT.exists():
    sys.path.insert(0, str(MINIVISION_ROOT))

try:
    from src.data_io import transform as minivision_transforms
    from src.generate_patches import CropImage
    from src.model_lib.MiniFASNet import MiniFASNetV1, MiniFASNetV1SE, MiniFASNetV2, MiniFASNetV2SE
    from src.utility import get_kernel, parse_model_name
except ImportError:
    minivision_transforms = None
    CropImage = None
    get_kernel = None
    parse_model_name = None
    MiniFASNetV1 = None
    MiniFASNetV1SE = None
    MiniFASNetV2 = None
    MiniFASNetV2SE = None

RECOGNITION_THRESHOLD = float(os.getenv("RECOGNITION_THRESHOLD", "0.35"))
ANTI_SPOOF_THRESHOLD = float(os.getenv("ANTI_SPOOF_THRESHOLD", "0.80"))

_face_app = None
_anti_spoof_model = None
_camera = None
_camera_lock = threading.Lock()


def resolve_minifasnet_model_path():
    configured_path = os.getenv("MINIFASNET_MODEL_PATH")
    if configured_path:
        return configured_path

    base_dir = Path(__file__).resolve().parent
    candidates = [
        base_dir / "models" / "minifasnet.onnx",
        base_dir / "models" / "minifesnet.onnx",
        base_dir / "models" / "2.7_80x80_MiniFASNetV2.pth",
        base_dir / "models" / "4_0_0_80x80_MiniFASNetV1SE.pth",
    ]

    for candidate in candidates:
        if candidate.exists():
            return str(candidate)

    return str(candidates[0])


class MiniFASNetAntiSpoof:
    def __init__(self, model_path, threshold=0.80):
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"MiniFASNet model not found: {model_path}. "
                "Place MiniFASNet weights in backend/models/ or set MINIFASNET_MODEL_PATH."
            )

        suffix = Path(model_path).suffix.lower()
        self.threshold = threshold

        if suffix == ".pth":
            if torch is None:
                raise ImportError(
                    "PyTorch is required for .pth MiniFASNet weights. "
                    "Install torch or provide an ONNX model with MINIFASNET_MODEL_PATH."
                )
            self.backend = "pytorch"
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            self.cropper = CropImage()
            self.transform = minivision_transforms.Compose([minivision_transforms.ToTensor()])
            self.models = self._load_pytorch_models(model_path)
            return

        if suffix == ".onnx":
            self.backend = "onnx"
            self.session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
            self.input_meta = self.session.get_inputs()[0]
            self.input_name = self.input_meta.name
            self.output_name = self.session.get_outputs()[0].name
            self.input_size = self._read_input_size(self.input_meta.shape)
            return

        raise ValueError(f"Unsupported MiniFASNet model type: {model_path}")

    def _load_pytorch_models(self, model_path):
        required_parts = (
            minivision_transforms,
            CropImage,
            get_kernel,
            parse_model_name,
            MiniFASNetV1,
            MiniFASNetV1SE,
            MiniFASNetV2,
            MiniFASNetV2SE,
        )
        if any(part is None for part in required_parts):
            raise ImportError(
                "MiniVision source files were not found under "
                "backend/third_party/Silent-Face-Anti-Spoofing."
            )

        model_file = Path(model_path)
        model_files = sorted(model_file.parent.glob("*MiniFASNet*.pth")) or [model_file]
        model_mapping = {
            "MiniFASNetV1": MiniFASNetV1,
            "MiniFASNetV2": MiniFASNetV2,
            "MiniFASNetV1SE": MiniFASNetV1SE,
            "MiniFASNetV2SE": MiniFASNetV2SE,
        }
        loaded_models = []

        for path in model_files:
            h_input, w_input, model_type, scale = parse_model_name(path.name)
            model = model_mapping[model_type](conv6_kernel=get_kernel(h_input, w_input)).to(self.device)
            state_dict = torch.load(path, map_location=self.device, weights_only=False)
            first_layer_name = next(iter(state_dict))
            if first_layer_name.startswith("module."):
                state_dict = {key.replace("module.", "", 1): value for key, value in state_dict.items()}
            model.load_state_dict(state_dict)
            model.eval()
            loaded_models.append({
                "path": str(path),
                "model": model,
                "height": h_input,
                "width": w_input,
                "scale": scale,
            })

        return loaded_models

    @staticmethod
    def _read_input_size(shape):
        dims = [dim if isinstance(dim, int) else None for dim in shape]
        if len(dims) == 4 and dims[1] == 3:
            return dims[3] or 80, dims[2] or 80
        if len(dims) == 4 and dims[3] == 3:
            return dims[2] or 80, dims[1] or 80
        return 80, 80

    @staticmethod
    def _softmax(values):
        values = values.astype(np.float32)
        values = values - np.max(values)
        exp_values = np.exp(values)
        return exp_values / np.sum(exp_values)

    def predict(self, face_crop):
        if face_crop.size == 0:
            return False, 0.0

        width, height = self.input_size
        resized = cv2.resize(face_crop, (width, height))
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        normalized = (rgb.astype(np.float32) - 127.5) / 128.0

        shape = self.input_meta.shape
        if len(shape) == 4 and shape[1] == 3:
            model_input = np.transpose(normalized, (2, 0, 1))[np.newaxis, :]
        else:
            model_input = normalized[np.newaxis, :]

        prediction = self.session.run(
            [self.output_name],
            {self.input_name: model_input.astype(np.float32)}
        )[0]

        scores = np.squeeze(prediction).astype(np.float32)
        if scores.ndim == 0:
            live_score = float(scores)
        elif np.all(scores >= 0) and np.isclose(np.sum(scores), 1.0, atol=0.05):
            live_score = float(scores[1] if scores.size > 1 else scores[0])
        else:
            probabilities = self._softmax(scores)
            live_score = float(probabilities[1] if probabilities.size > 1 else probabilities[0])

        return live_score >= self.threshold, live_score

    def predict_frame(self, frame, bbox):
        if self.backend == "onnx":
            return self.predict(crop_face(frame, bbox))

        x1, y1, x2, y2 = bbox.astype(int)
        minifasnet_bbox = [x1, y1, x2 - x1 + 1, y2 - y1 + 1]
        prediction = np.zeros((1, 3), dtype=np.float32)

        for model_info in self.models:
            crop = self.cropper.crop(
                org_img=frame,
                bbox=minifasnet_bbox,
                scale=model_info["scale"],
                out_w=model_info["width"],
                out_h=model_info["height"],
                crop=model_info["scale"] is not None,
            )
            tensor = self.transform(crop).unsqueeze(0).to(self.device)
            with torch.no_grad():
                output = model_info["model"](tensor)
                prediction += torch.softmax(output, dim=1).cpu().numpy()

        averaged_prediction = prediction / len(self.models)
        predicted_label = int(np.argmax(averaged_prediction))
        live_score = float(averaged_prediction[0][1])

        return predicted_label == 1 and live_score >= self.threshold, live_score


class AntiSpoofFallback:
    backend = "fallback"

    def predict_frame(self, frame, bbox):
        return True, 1.0


def crop_face(frame, bbox, scale=1.25):
    frame_h, frame_w = frame.shape[:2]
    x1, y1, x2, y2 = bbox.astype(int)
    box_w = x2 - x1
    box_h = y2 - y1
    pad_w = int((scale - 1.0) * box_w / 2)
    pad_h = int((scale - 1.0) * box_h / 2)
    x1 = max(0, x1 - pad_w)
    y1 = max(0, y1 - pad_h)
    x2 = min(frame_w, x2 + pad_w)
    y2 = min(frame_h, y2 + pad_h)
    return frame[y1:y2, x1:x2]


def get_face_app():
    global _face_app
    if _face_app is None:
        _face_app = FaceAnalysis(name="buffalo_l")
        _face_app.prepare(ctx_id=-1)
    return _face_app


def get_anti_spoof_model():
    global _anti_spoof_model
    if _anti_spoof_model is None:
        try:
            _anti_spoof_model = MiniFASNetAntiSpoof(
                resolve_minifasnet_model_path(),
                threshold=ANTI_SPOOF_THRESHOLD
            )
        except Exception as exc:
            if os.getenv("ALLOW_ANTI_SPOOF_FALLBACK", "1").lower() in {"1", "true", "yes"}:
                warnings.warn(
                    f"Anti-spoof model unavailable; continuing without liveness checks: {exc}",
                    RuntimeWarning,
                    stacklevel=2,
                )
                _anti_spoof_model = AntiSpoofFallback()
            else:
                raise
    return _anti_spoof_model


def get_camera(camera_index=0):
    global _camera
    if _camera is None or not _camera.isOpened():
        _camera = cv2.VideoCapture(camera_index)
    return _camera


def release_camera():
    global _camera
    with _camera_lock:
        if _camera is not None:
            _camera.release()
            _camera = None


def read_camera_frame(camera_index=0):
    with _camera_lock:
        camera = get_camera(camera_index)
        if not camera.isOpened():
            raise RuntimeError("Could not open webcam.")

        ok, frame = camera.read()
        if not ok:
            raise RuntimeError("Could not read from webcam.")

    return frame


def encode_jpeg_frame(frame):
    ok, buffer = cv2.imencode(".jpg", frame)
    if not ok:
        raise RuntimeError("Could not encode webcam frame.")

    return buffer.tobytes()


def detect_from_camera(camera_index=0):
    frame = read_camera_frame(camera_index)
    faces = get_face_app().get(frame)
    if not faces:
        return {
            "status": "no_face",
            "message": "No face detected.",
            "faces": []
        }

    detections = []
    anti_spoof = get_anti_spoof_model()
    for face in faces:
        is_live, live_score = anti_spoof.predict_frame(frame, face.bbox)
        detections.append({
            "is_live": is_live,
            "live_score": live_score,
            "embedding": face.embedding.astype(np.float32).tolist() if is_live else None,
        })

    return {
        "status": "face_detected",
        "message": "Face detected.",
        "faces": detections
    }
