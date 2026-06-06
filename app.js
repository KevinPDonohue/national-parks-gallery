const API_KEY = 'n6oTsvuNfP9STH6DHIobRkte91e8g7nwcmQ3lUFp';

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

const EXCLUDE_KEYWORDS = [
  'visitor', 'center', 'building', 'lodge', 'cabin', 'ranger', 'station',
  'people', 'person', 'hiker', 'hikers', 'climber', 'tourist', 'tourists',
  'crowd', 'staff', 'employee', 'volunteer', 'sign', 'road', 'highway',
  'parking', 'campground', 'tent', 'boat', 'bridge', 'dam', 'fence',
  'trail crew', 'construction', 'facility', 'museum', 'historic', 'monument',
  'portrait', 'selfie', 'group', 'family', 'children', 'kids', 'school',
  'craft', 'map', 'art', 'exhibit', 'display', 'painting', 'drawing',
  'artifact', 'object', 'tool', 'weapon', 'pottery', 'basket', 'textile',
  'document', 'illustration', 'diagram', 'chart', 'poster', 'brochure',
  'interpretive', 'wayside', 'plaque',
];

const INCLUDE_KEYWORDS = [
  'landscape', 'scenery', 'scenic', 'mountain', 'valley', 'canyon', 'river',
  'lake', 'forest', 'wilderness', 'glacier', 'waterfall', 'meadow', 'sunrise',
  'sunset', 'sky', 'cloud', 'storm', 'snow', 'ice', 'desert', 'cliff',
  'rock', 'peak', 'ridge', 'vista', 'overlook', 'wildlife', 'animal',
  'bird', 'bear', 'elk', 'bison', 'deer', 'wolf', 'fox', 'eagle',
  'tree', 'flower', 'plant', 'geyser', 'hot spring', 'tide', 'coast', 'beach',
];

function isNaturePhoto(photo) {
  const text = `${photo.title} ${photo.tags || ''}`.toLowerCase();
  if (EXCLUDE_KEYWORDS.some(kw => text.includes(kw))) return false;
  const hasNatureSignal = INCLUDE_KEYWORDS.some(kw => text.includes(kw));
  const hasNoTitle = !photo.title || photo.title.trim().length < 3;
  if (!hasNatureSignal && hasNoTitle) return false;
  return true;
}

let photos = [];
const gridEl = document.getElementById('grid');

// Lightbox
const lightbox = document.createElement('div');
lightbox.id = 'lightbox';
lightbox.innerHTML = `
  <button id="lightbox-close" aria-label="Close">&times;</button>
  <img id="lightbox-img" src="" alt="" />
  <div id="lightbox-caption"></div>
`;
document.body.appendChild(lightbox);

lightbox.querySelector('#lightbox-close').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

function openLightbox(photo) {
  lightbox.querySelector('#lightbox-img').src = photo.url;
  lightbox.querySelector('#lightbox-img').alt = photo.title || photo.park;
  lightbox.querySelector('#lightbox-caption').textContent =
    `${photo.park}${photo.credit ? ' · ' + photo.credit : ''}`;
  lightbox.classList.add('open');
}

function closeLightbox() {
  lightbox.classList.remove('open');
}

async function fetchPhotos() {
  const results = await Promise.allSettled(
    PARK_CODES.map(code =>
      fetch(`https://developer.nps.gov/api/v1/multimedia/galleries/assets?parkCode=${code}&limit=20&api_key=${API_KEY}`)
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

  if (photos.length === 0) await fetchParkImages();

  if (photos.length === 0) {
    gridEl.innerHTML = '<p style="color:#f85149;padding:2rem;text-align:center">No photos found. Check your API key.</p>';
    return;
  }

  shuffle(photos);
  buildGrid();
}

async function fetchParkImages() {
  const res = await fetch(
    `https://developer.nps.gov/api/v1/parks?parkCode=${PARK_CODES.join(',')}&fields=images&api_key=${API_KEY}`
  ).then(r => r.json());

  if (!res.data) return;

  for (const park of res.data) {
    for (const img of (park.images || [])) {
      if (img.url) {
        const photo = {
          url: img.url.startsWith('http') ? img.url : 'https://www.nps.gov' + img.url,
          park: park.fullName,
          credit: img.credit || '',
          title: img.title || '',
          tags: '',
        };
        if (isNaturePhoto(photo)) photos.push(photo);
      }
    }
  }
}

function buildGrid() {
  gridEl.innerHTML = '';
  photos.forEach(photo => {
    const div = document.createElement('div');
    div.className = 'thumb';

    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = photo.title || photo.park;
    img.loading = 'lazy';

    const caption = document.createElement('div');
    caption.className = 'caption';
    caption.textContent = photo.park;

    div.appendChild(img);
    div.appendChild(caption);
    div.addEventListener('click', () => openLightbox(photo));
    gridEl.appendChild(div);
  });
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

fetchPhotos();
