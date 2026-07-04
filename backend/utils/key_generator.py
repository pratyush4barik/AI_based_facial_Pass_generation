import random

def generate_admin_key():
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ123456789"

    key = "".join(random.choice(chars) for _ in range(10))

    return key[:5] + "-" + key[5:]