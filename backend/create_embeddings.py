import os
import cv2
import numpy as np
import insightface

# Initialize ArcFace
app = insightface.app.FaceAnalysis()
app.prepare(ctx_id=-1)

# Folders
image_folder = "faces"
embedding_folder = "embeddings"

# Create embeddings folder if it doesn't exist
os.makedirs(embedding_folder, exist_ok=True)

# Process all jpg files
for file in os.listdir(image_folder):

    if file.lower().endswith(".jpg"):

        image_path = os.path.join(image_folder, file)

        img = cv2.imread(image_path)

        if img is None:
            print(f"Cannot read: {file}")
            continue

        faces = app.get(img)

        if len(faces) == 0:
            print(f"No face detected: {file}")
            continue

        # Take first detected face
        embedding = faces[0].embedding

        # Save embedding
        filename = os.path.splitext(file)[0]
        embedding_path = os.path.join(
            embedding_folder,
            f"{filename}.npy"
        )

        np.save(embedding_path, embedding)

        print(f"Saved: {embedding_path}")

print("Completed!")