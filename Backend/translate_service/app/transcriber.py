import whisper
import tempfile
from .utils import download_audio
import os

model = whisper.load_model("small")

def transcribe_audio(video_url, language):
    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
            wav_path = temp_audio.name
            download_audio(video_url, wav_path)
            result = model.transcribe(wav_path, language=language, task="transcribe")

            srt_segments = []
            for segment in result["segments"]:
                start = segment["start"]
                end = segment["end"]
                text = segment["text"]

                start_srt = f"00:{int(start//60):02d}:{int(start%60):02d},000"
                end_srt = f"00:{int(end//60):02d}:{int(end%60):02d},000"

                srt_segments.append({
                    "start": start_srt,
                    "end": end_srt,
                    "text": text
                })

            return srt_segments
    finally:
        if os.path.exists(wav_path):
            os.remove(wav_path)
