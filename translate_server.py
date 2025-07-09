# translate_server.py
from flask import Flask, request, jsonify
import argostranslate.package, argostranslate.translate

# Load and install packages if needed
available_packages = argostranslate.package.get_available_packages()
installed_languages = argostranslate.translate.get_installed_languages()

for lang_code in ['ur', 'ar']:
    if not any(l.code == lang_code for l in installed_languages):
        package = next(pkg for pkg in available_packages if pkg.from_code == 'en' and pkg.to_code == lang_code)
        download_path = package.download()
        argostranslate.package.install_from_path(download_path)

app = Flask(__name__)

@app.route('/translate', methods=['POST'])
def translate():
    data = request.json
    text = data['q']
    source = data['source']
    target = data['target']

    translated = argostranslate.translate.translate(text, source, target)
    return jsonify({'translatedText': translated})

if __name__ == '__main__':
    app.run(port=5005)
