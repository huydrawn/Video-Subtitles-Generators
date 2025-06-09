from flask import Blueprint, request, jsonify
from .transcriber import transcribe_audio

bp = Blueprint("main", __name__)

@bp.route("/transcribe", methods=["POST"])
def transcribe():
    data = request.get_json()
    url = data.get("url")
    lang = data.get("language", "en")
    translate = data.get("translate")


    if not url:
        return jsonify({"error": "Missing 'url'"}), 400

    try:
        srt_segments = transcribe_audio(url, lang,translate)
        return jsonify({"srt": srt_segments})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
