import whisper
import tempfile
from .utils import download_audio

model = whisper.load_model("small")

def transcribe_audio(video_url, language):
    with tempfile.NamedTemporaryFile(suffix=".wav") as temp_audio:
        download_audio(video_url, temp_audio.name)
        result = model.transcribe(temp_audio.name, language=language, task="transcribe")

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
