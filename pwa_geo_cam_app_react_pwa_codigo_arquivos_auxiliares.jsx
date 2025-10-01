// PWA GeoCam — Single-file React component + arquivos auxiliares
// ---------------------------------------------------------------
// Inclui:
// - src/App.jsx         <- componente React principal
// - public/index.html   <- HTML base
// - public/manifest.json
// - public/sw.js        <- service worker simples para cache
// - package.json (exemplo)
// ---------------------------------------------------------------

import React, { useState, useRef, useEffect } from 'react'

export default function App() {
  const [loc, setLoc] = useState(null)
  const [locError, setLocError] = useState(null)
  const [taking, setTaking] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [dogUrl, setDogUrl] = useState(null)
  const [status, setStatus] = useState('')

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  async function fetchDog() {
    setStatus('Buscando imagem de dog...')
    try {
      const res = await fetch('https://dog.ceo/api/breeds/image/random')
      const data = await res.json()
      if (data && data.status === 'success') {
        setDogUrl(data.message)
        setStatus('Imagem de dog carregada.')
      } else {
        setStatus('Resposta inesperada da API.')
      }
    } catch (err) {
      setStatus('Erro ao buscar API: ' + err.message)
    }
  }

  function getLocation() {
    setLoc(null)
    setLocError(null)
    setStatus('Obtendo localização...')

    if (!('geolocation' in navigator)) {
      setLocError('Geolocalização não suportada pelo navegador.')
      setStatus('')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        setLoc({ latitude, longitude, accuracy })
        setStatus('Localização obtida.')
      },
      (err) => {
        setLocError(err.message)
        setStatus('Erro ao obter localização.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  async function startCamera() {
    setStatus('Iniciando câmera...')
    setTaking(true)
    setPhoto(null)
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia não disponível')
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setStatus('Câmera ativa. Posicione e toque em "Tirar foto"')
    } catch (err) {
      setTaking(false)
      setStatus('Erro ao acessar câmera: ' + err.message)
    }
  }

  function stopCamera() {
    setTaking(false)
    setStatus('Câmera parada.')
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  function takePhotoFromVideo() {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setPhoto(dataUrl)
    setStatus('Foto capturada.')
    stopCamera()
  }

  function onFileInputChange(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhoto(reader.result)
    reader.readAsDataURL(file)
    setStatus('Foto carregada do dispositivo.')
  }

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return (
    <div className="min-h-screen p-4 bg-gray-50 text-gray-900">
      <header className="max-w-3xl mx-auto mb-4">
        <h1 className="text-2xl font-bold">PWA GeoCam</h1>
        <p className="text-sm text-gray-600">Tire fotos, salve coordenadas e veja uma imagem aleatória de dog (API pública).</p>
      </header>

      <main className="max-w-3xl mx-auto space-y-4">
        <section className="card p-4 border rounded">
          <h2 className="font-semibold">Geolocalização</h2>
          <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={getLocation}>Obter localização</button>
          {loc && (
            <div className="text-sm mt-2">
              <div>Latitude: {loc.latitude}</div>
              <div>Longitude: {loc.longitude}</div>
              <div>Precisão (metros): {loc.accuracy}</div>
            </div>
          )}
          {locError && <div className="text-sm text-red-600">Erro: {locError}</div>}
        </section>

        <section className="card p-4 border rounded">
          <h2 className="font-semibold">Câmera</h2>
          <div className="flex gap-2 mb-2">
            {!taking ? (
              <button className="px-3 py-1 rounded bg-green-600 text-white" onClick={startCamera}>Abrir câmera</button>
            ) : (
              <button className="px-3 py-1 rounded bg-red-600 text-white" onClick={stopCamera}>Parar câmera</button>
            )}
            <label className="px-3 py-1 rounded bg-gray-200 cursor-pointer">
              <input type="file" accept="image/*" capture="environment" onChange={onFileInputChange} style={{ display: 'none' }} />
              Carregar foto
            </label>
            {taking && (
              <button className="px-3 py-1 rounded bg-indigo-600 text-white" onClick={takePhotoFromVideo}>Tirar foto</button>
            )}
          </div>
          {taking && <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxHeight: 360, background: '#000' }} />}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {photo && (
            <div className="mt-2">
              <img src={photo} alt="captured" style={{ width: '100%', maxHeight: 420, objectFit: 'contain' }} />
              <a download={`photo-${Date.now()}.jpg`} href={photo} className="px-3 py-1 rounded bg-gray-800 text-white inline-block mt-2">Baixar imagem</a>
            </div>
          )}
        </section>

        <section className="card p-4 border rounded">
          <h2 className="font-semibold">API pública — imagem de dog</h2>
          <button className="px-3 py-1 rounded bg-yellow-600 text-white" onClick={fetchDog}>Buscar dog aleatório</button>
          {dogUrl && <img src={dogUrl} alt="dog" style={{ width: '100%', maxHeight: 420, objectFit: 'contain', marginTop: '0.5rem' }} />}
        </section>

        <section className="card p-4 border rounded text-sm text-gray-600">
          <h2 className="font-semibold">Status / mensagens</h2>
          <div>{status}</div>
        </section>
      </main>
    </div>
  )
}

/* public/manifest.json */
/* ----------------------------------------------------- */
/* Salve este JSON como public/manifest.json */
{
  "name": "PWA GeoCam",
  "short_name": "GeoCam",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}

/* public/sw.js */
/* ----------------------------------------------------- */
/* Salve este JS como public/sw.js */
const CACHE_NAME = 'pwa-geocam-v1';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => {
      if (key !== CACHE_NAME) return caches.delete(key);
    })))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') return;
  evt.respondWith(
    caches.match(evt.request).then((resp) => resp || fetch(evt.request).then((res) => {
      return caches.open(CACHE_NAME).then((cache) => {
        cache.put(evt.request, res.clone());
        return res;
      });
    })).catch(() => caches.match('/'))
  );
});
