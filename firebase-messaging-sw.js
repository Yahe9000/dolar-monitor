// 1. Importaciones de Firebase (versión compat para Service Workers)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// 2. Configuración de tu proyecto Dólar Monitor Diario
firebase.initializeApp({
  apiKey: "AIzaSyCesCFnkX1KISBYzgHNvBdwY2R1Be7c9UQ",
  authDomain: "dolar-monitor-diario.firebaseapp.com",
  projectId: "dolar-monitor-diario",
  storageBucket: "dolar-monitor-diario.firebasestorage.app",
  messagingSenderId: "507179043038",
  appId: "1:507179043038:web:65f5541b7a09cb45531a4f"
});

const messaging = firebase.messaging();

// 3. Lógica de Notificaciones en Segundo Plano
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Mensaje recibido en segundo plano ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    // Usamos el mismo icono de tu manifest para mantener la marca de la app
    icon: './Logo_512.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 4. Lógica de Caché para la PWA (Modo Offline y carga rápida)
const CACHE_NAME = 'dmd-cache-v1';

// Aquí listamos TODOS los archivos que necesita tu app para funcionar
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './calculadora-euro.js',
  './tasa-personalizada.js',
  './guardados.js',
  './manifest.json',
  './Logo_512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Guardando archivos en caché...');
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      // Si el archivo está en caché, lo devuelve. Si no, lo busca en internet.
      return response || fetch(e.request);
    })
  );
});
