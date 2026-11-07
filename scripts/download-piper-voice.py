"""Tải model giọng Việt Piper vi_VN-vais1000-medium vào models/piper/.

Model không có trong repo vì file nặng (~60MB). Chạy từ thư mục gốc repo:
    python scripts/download-piper-voice.py
Nguồn: rhasspy/piper-voices trên Hugging Face, giấy phép CC BY 4.0.
"""

import sys
import urllib.request
from pathlib import Path

BASE_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/vi/vi_VN/vais1000/medium"
FILES = ["vi_VN-vais1000-medium.onnx", "vi_VN-vais1000-medium.onnx.json"]


def main() -> int:
    thu_muc_dich = Path(__file__).resolve().parents[1] / "models" / "piper"
    thu_muc_dich.mkdir(parents=True, exist_ok=True)
    for ten_tep in FILES:
        duong_dan = thu_muc_dich / ten_tep
        if duong_dan.is_file() and duong_dan.stat().st_size > 0:
            print(f"Đã có: {duong_dan}")
            continue
        print(f"Đang tải: {ten_tep} ...")
        urllib.request.urlretrieve(f"{BASE_URL}/{ten_tep}", duong_dan)
        print(f"Đã lưu: {duong_dan} ({duong_dan.stat().st_size} bytes)")
    print("Xong. Đã đủ model giọng Việt để chạy pipeline.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
