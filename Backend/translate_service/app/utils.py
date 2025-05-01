import subprocess

def download_audio(video_url, output_path):
    cmd = [
        "ffmpeg", "-y", "-i", video_url,
        "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", output_path
    ]
    subprocess.run(cmd, check=True)
