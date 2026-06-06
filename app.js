const API_KEY = 'n6oTsvuNfP9STH6DHIobRkte91e8g7nwcmQ3lUFp';

// A curated list of park codes to pull photos from
const PARK_CODES = [
  'yell',  // Yellowstone
  'grca',  // Grand Canyon
  'yose',  // Yosemite
  'zion',  // Zion
  'romo',  // Rocky Mountain
  'acad',  // Acadia
  'glac',  // Glacier
  'arch',  // Arches
  'grte',  // Grand Teton
  'olym',  // Olympic
];

// Keywords in titles/tags that suggest people, structures, or man-made items
const EXCLUDE_KEYWORDS = [
  'visitor', 'center', 'building', 'lodge', 'cabin', 'ranger', 'station',
  'people', 'person', 'hiker', 'hikers', 'climber', 'tourist', 'tourists',
  'crowd', 'staff', 'employee', 'volunteer', 'sign', 'road', 'highway',
  'parking', 'campground', 'tent', 'boat', 'bridge', 'dam', 'fence',
  'trail crew', 'construction', 'facility', 'museum', 'historic', 'monument',
  'portrait', 'selfie', 'group', 'family', 'children', 'kids', 'school',
];

function isNaturePhoto(photo) {
  const text = `${photo.title} ${photo.tags || ''}`.toLowerCase();
  return !EXCLUDE_KEYWORDS.some(kw => text.includes(kw));
}

let photos = [];
let current = 0;
let timer = null;
const INTERVAL = 5000;

const slideImg = document.getElementById('slide-img');
const parkName = document.getElementById('park-name');
const photoCredit = document.getElementById('photo-credit');
const dotsEl = document.getElementById('dots');
const gridEl = document.getElementById('grid');
const slideContainer = document.getElementById('slide-container');

async function fetchPhotos() {
  slideContainer.classList.add('loading');

  const results = await Promise.allSettled(
    PARK_CODES.map(code =>
      fetch(`https://developer.nps.gov/api/v1/multimedia/galleries/assets?parkCode=${code}&limit=10&api_key=${API_KEY}`)
        .then(r => r.json())
        .then(data => ({ code, data }))
    )
  );

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const { code, data } = result.value;
    if (!data.data) continue;

    for (const asset of data.data) {
      if (asset.fileInfo?.url) {
        const photo = {
          url: asset.fileInfo.url,
          park: asset.relatedParks?.[0]?.fullName || code.toUpperCase(),
          credit: asset.credit || '',
          title: asset.title || '',
          tags: (asset.tags || []).join(' '),
        };
        if (isNaturePhoto(photo)) photos.push(photo);
      }
    }
  }

  // Fallback: try the parks endpoint for images if gallery gave nothing
  if (photos.length === 0) {
    await fetchParkImages();
  }

  slideContainer.classList.remove('loading');

  if (photos.length === 0) {
    showError('No photos found. Check your API key and try again.');
    return;
  }

  shuffle(photos);
  buildGrid();
  buildDots();
  showSlide(0);
  startTimer();
}

async function fetchParkImages() {
  const res = await fetch(
    `https://developer.nps.gov/api/v1/parks?parkCode=${PARK_CODES.join(',')}&fields=images&api_key=${API_KEY}`
  ).then(r => r.json());

  if (!res.data) return;

  for (const park of res.data) {
    for (const img of (park.images || []).slice(0, 2)) {
      if (img.url) {
        const photo = {
          url: img.url.startsWith('http') ? img.url : 'https://www.nps.gov' + img.url,
          park: park.fullName,
          credit: img.credit || '',
          title: img.title || '',
          tags: (img.tags || []).join(' '),
        };
        if (isNaturePhoto(photo)) photos.push(photo);
      }
    }
  }
}

function showSlide(index) {
  current = (index + photos.length) % photos.length;
  const photo = photos[current];

  slideImg.classList.add('fade');
  setTimeout(() => {
    slideImg.src = photo.url;
    slideImg.alt = photo.title || photo.park;
    parkName.textContent = photo.park;
    photoCredit.textContent = photo.credit ? `Photo: ${photo.credit}` : '';
    slideImg.classList.remove('fade');
  }, 300);

  document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === current));
  document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('active', i === current));
}

function buildDots() {
  dotsEl.innerHTML = '';
  photos.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'dot';
    dot.setAttribute('aria-label', `Go to photo ${i + 1}`);
    dot.addEventListener('click', () => { resetTimer(); showSlide(i); });
    dotsEl.appendChild(dot);
  });
}

function buildGrid() {
  gridEl.innerHTML = '';
  photos.forEach((photo, i) => {
    const div = document.createElement('div');
    div.className = 'thumb';
    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = photo.park;
    img.loading = 'lazy';
    div.appendChild(img);
    div.addEventListener('click', () => { resetTimer(); showSlide(i); });
    gridEl.appendChild(div);
  });
}

function startTimer() {
  timer = setInterval(() => showSlide(current + 1), INTERVAL);
}

function resetTimer() {
  clearInterval(timer);
  startTimer();
}

function showError(msg) {
  slideContainer.innerHTML = `<p id="error-msg">${msg}</p>`;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

document.getElementById('prev').addEventListener('click', () => { resetTimer(); showSlide(current - 1); });
document.getElementById('next').addEventListener('click', () => { resetTimer(); showSlide(current + 1); });

// Keyboard navigation
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') { resetTimer(); showSlide(current - 1); }
  if (e.key === 'ArrowRight') { resetTimer(); showSlide(current + 1); }
});

fetchPhotos();
