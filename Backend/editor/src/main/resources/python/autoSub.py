import sys
import subprocess
import os
import json

from vosk import Model, KaldiRecognizer
import wave

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
    start_time = 0  # Thời gian bắt đầu của câu
    current_sentence = []
    last_end_time = 0

    while True:
        data = wf.readframes(4000)
        if len(data) == 0:
            break
        if rec.AcceptWaveform(data):
            res = json.loads(rec.Result())
            if 'result' in res:
                for word in res['result']:
                    word_text = word['word']
                    word_start = word['start']
                    word_end = word['end']

                    # Kiểm tra nếu từ này tiếp tục trong câu
                    if word_start > last_end_time + 0.3:  # 0.3s là thời gian chờ giữa các câu
                        # Nếu có gián đoạn dài, kết thúc câu cũ và bắt đầu câu mới
                        if current_sentence:
                            results.append({
                                'start_time': current_sentence[0]['start'],
                                'end_time': last_end_time,
                                'text': ' '.join([w['word'] for w in current_sentence])
                            })
                            current_sentence = []
                    current_sentence.append(word)
                    last_end_time = word_end
    
    # Thêm câu cuối cùng
    if current_sentence:
        results.append({
            'start_time': current_sentence[0]['start'],
            'end_time': last_end_time,
            'text': ' '.join([w['word'] for w in current_sentence])
        })
    return results

def generate_subtitle_text(subtitles):
    subtitle_str = ""
    for idx, subtitle in enumerate(subtitles, start=1):
        start_time = subtitle['start_time']
        end_time = subtitle['end_time']
        text = subtitle['text']
        subtitle_str += f"{idx}\n"
        subtitle_str += f"{format_time(start_time)} --> {format_time(end_time)}\n"
        subtitle_str += f"{text}\n\n"
    return subtitle_str

def format_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    milliseconds = int((seconds - int(seconds)) * 1000)
    return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}"

if __name__ == "__main__":
    video_url = sys.argv[1]
    model_path = sys.argv[2]
    audio_path = "temp_audio.wav"

    try:
        download_audio(video_url, audio_path)
        transcripts = transcribe_audio(model_path, audio_path)

        # Chuyển kết quả thành chuỗi phụ đề dễ đọc
        subtitle_text = generate_subtitle_text(transcripts)

        # Trả về kết quả dưới dạng chuỗi dễ hiểu
        result = {
            "subtitle": subtitle_text  # Danh sách chứa các câu và thời gian của chúng
        }

        # Output kết quả dưới dạng văn bản dễ đọc
        print("-----------------------------------------------------")
        print(subtitle_text)
    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)
