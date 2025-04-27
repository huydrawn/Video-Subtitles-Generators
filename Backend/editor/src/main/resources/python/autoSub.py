import sys
import subprocess
import os

from vosk import Model, KaldiRecognizer
import wave
import json

def download_audio(url, output_audio_path):
    cmd = [
        'ffmpeg', '-i', url, '-vn',
        '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
        output_audio_path
    ]
    subprocess.run(cmd, check=True)

def transcribe_audio(model_path, audio_path):
    model = Model(model_path)
    wf = wave.open(audio_path, "rb")
    rec = KaldiRecognizer(model, wf.getframerate())

    results = []
    while True:
        data = wf.readframes(4000)
        if len(data) == 0:
            break
        if rec.AcceptWaveform(data):
            res = json.loads(rec.Result())
            if 'text' in res:
                results.append(res['text'])

    # Lấy kết quả cuối cùng
    final_res = json.loads(rec.FinalResult())
    if 'text' in final_res:
        results.append(final_res['text'])

    return results

def generate_srt_text(transcripts):
    srt = ""
    for idx, text in enumerate(transcripts, start=1):
        start_time = idx * 2
        end_time = start_time + 2
        srt += f"{idx}\n"
        srt += f"00:00:{start_time:02d},000 --> 00:00:{end_time:02d},000\n"
        srt += f"{text}\n\n"
    return srt

if __name__ == "__main__":
    video_url = sys.argv[1]
    model_path = sys.argv[2]
    audio_path = "temp_audio.wav"

    try:
        download_audio(video_url, audio_path)
        transcripts = transcribe_audio(model_path, audio_path)
        srt_text = generate_srt_text(transcripts)

        print(srt_text)  # << In ra trực tiếp, Java đọc được
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)
