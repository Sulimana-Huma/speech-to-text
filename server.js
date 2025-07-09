const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});
const ASSEMBLY_API_KEY = '7e31d834a8da4d84ae40abfbdbf08c9d';

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

app.use(express.static('public'));

app.post('/upload', upload.single('file'), async (req, res) => {
  const allowedTypes = [
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    'video/mp4', 'video/avi', 'video/ogg', 'video/webm'
  ];

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    const filePath = req.file.path;
    console.log('📥 Received file:', req.file.originalname);

    // Upload to AssemblyAI
    const uploadRes = await axios.post(
      'https://api.assemblyai.com/v2/upload',
      fs.createReadStream(filePath),
      { headers: { authorization: ASSEMBLY_API_KEY } }
    );
    const audioUrl = uploadRes.data.upload_url;

    // Transcription request
    let transcriptId = '';
    try {
      const transcriptRes = await axios.post(
        'https://api.assemblyai.com/v2/transcript',
        {
          audio_url: audioUrl,
          language_code: 'ur',
          speech_model: 'nano'
        },
        { headers: { authorization: ASSEMBLY_API_KEY } }
      );
      transcriptId = transcriptRes.data.id;
    } catch (err) {
      console.error('❌ Transcription request failed:', err.response?.data || err.message);
      throw err;
    }

    // Polling
    let status = 'processing';
    let transcriptText = '';
    while (status !== 'completed') {
      await new Promise(r => setTimeout(r, 5000));
      const poll = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        { headers: { authorization: ASSEMBLY_API_KEY } }
      );
      status = poll.data.status;

      if (status === 'completed') {
        transcriptText = poll.data.text;
      } else if (status === 'error') {
        console.error('🛑 Transcription error response:', poll.data);
        throw new Error('Transcription failed');
      }
    }

    // Send result
    res.json({
      originalText: transcriptText,
      translations: { urdu: transcriptText }
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ error: 'Failed to process file' });
  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

app.listen(3000, () => console.log('✅ Server running at http://localhost:3000'));




