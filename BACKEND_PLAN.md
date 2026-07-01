# Health Tracker — Backend + DB Planı

> Amaç: localStorage'dan kalıcı bir backend + veritabanına geçmek; verileri cihazdan
> bağımsız saklamak, geçmişe bakabilmek (örn. "dün ne yedim"), ve app'i günlük gerçek
> kullanıma uygun hale getirmek.

## 1. Mimari Kararı

**Health-tracker kendi backend'ine + DB'sine sahip olur.** Etsy portalı ve diğer
projeler ayrı kalır. Ortak olan tek katman **kimlik (Google OAuth)** — o da ayrı bir
servis değil, tüm app'lerin aynı Google Cloud OAuth client'ını yeniden kullanması
şeklinde paylaşılır.

**Neden shared "platform backend" değil:** Sağlık takibi ile Etsy otomasyonu farklı
domainler; tek servise koymak bug/deploy riskini ve bağımlılık çakışmasını artırır,
asıl kullanılacak app'i geciktirir. Desenleri tekrar kullanırız, kodu değil.

### Stack
- **Runtime:** Node.js + Express (mevcut `server.js` genişletilir)
- **DB:** PostgreSQL (Railway tek tık, `DATABASE_URL` env)
- **DB katmanı:** Drizzle ORM (tipli şema + migration'lar)
- **Auth:** Google OAuth + e-posta allowlist (tek kişi: sen), oturum JWT cookie
- **Frontend:** mevcut React PWA; localStorage yerine API çağrıları (localStorage
  offline cache olarak kalabilir — "önce cache, sonra sync")
- **Hosting:** Railway (mevcut servis)

---

## 2. Kimlik / Auth

### Yaklaşım: "Ortak kimlik, ayrı servis yok"
- FLM projesinde kurulu Google Cloud OAuth client'ı **tüm app'lerde** yeniden kullan
  (Etsy, FLM portalı, health-tracker + ileride yapılacaklar). Her app kendi redirect
  URI'sini ekler, kendi `ALLOWED_EMAILS` allowlist'iyle erişimi kısıtlar.
- Health-tracker'ın redirect URI'sini o client'ın "Authorized redirect URIs"
  listesine ekle: `https://<yeni-railway-domain>/api/auth/google/callback`
- Backend, Google'dan dönen token'ı doğrular, kullanıcının e-postasını okur.
- **Allowlist:** yalnızca `ALLOWED_EMAILS` env'inde tanımlı e-posta(lar) girebilir
  (şimdilik sadece senin adresin). Başka biri Google ile girse bile reddedilir.
- Başarılı girişte backend kendi **JWT'sini** httpOnly cookie olarak set eder;
  sonraki tüm `/api/*` istekleri bu cookie ile doğrulanır.

### Akış
1. Kullanıcı "Google ile giriş" → `/api/auth/google` → Google onay ekranı
2. Google → `/api/auth/google/callback?code=...`
3. Backend code'u token'a çevirir, e-postayı alır, allowlist kontrolü
4. `users` tablosunda upsert → JWT cookie set → app'e yönlendir
5. Frontend açılışta `/api/me` ile oturumu doğrular; yoksa giriş ekranı gösterir

### Gerekli env değişkenleri
```
DATABASE_URL=...            # Railway Postgres otomatik verir
GOOGLE_CLIENT_ID=...        # FLM'den
GOOGLE_CLIENT_SECRET=...    # FLM'den
GOOGLE_REDIRECT_URI=https://.../api/auth/google/callback
ALLOWED_EMAILS=idildadan@gmail.com
JWT_SECRET=...              # rastgele uzun string
ANTHROPIC_API_KEY=...       # mevcut (AI öğün ayrıştırma)
```

---

## 3. Veritabanı Şeması

```
users
  id            uuid PK (default gen_random_uuid)
  email         text unique not null
  name          text
  picture       text
  created_at    timestamptz default now()

goals                       -- kullanıcı başına tek satır
  user_id       uuid PK FK -> users(id)
  steps         int   default 8000
  water         int   default 2000     -- ml
  caffeine      real  default 3        -- doz
  calories      int   default 2000
  protein       int   default 100      -- g
  sleep         real  default 8        -- saat
  weight        real  default 70       -- kg (hedef)
  updated_at    timestamptz default now()

days                        -- kullanıcı + tarih başına tek satır
  id            uuid PK
  user_id       uuid FK -> users(id)
  date          date not null          -- YYYY-MM-DD (kullanıcının yerel günü)
  steps         int   default 0
  water         int   default 0
  turkish_coffee int  default 0
  filter_coffee int   default 0
  sleep         real  default 0
  weight        real  default 0
  updated_at    timestamptz default now()
  UNIQUE(user_id, date)
  -- calories/protein türetilmiş: food_entries toplamı (tabloda tutulmaz, hesaplanır)
  -- caffeine türetilmiş: turkish_coffee*0.5 + filter_coffee*1.25

food_entries                -- güne bağlı yemek kalemleri
  id            uuid PK
  user_id       uuid FK -> users(id)
  date          date not null
  name          text not null
  grams         real                    -- null olabilir (manuel/AI kalemleri)
  calories      int   not null
  protein       real  not null
  source        text  default 'manual'  -- 'local' | 'online' | 'manual' | 'ai' | 'preset'
  created_at    timestamptz default now()
  INDEX(user_id, date)

meal_presets                -- sık yenen öğünlerin kısayolu (tek tıkla eklemek için)
  id            uuid PK
  user_id       uuid FK -> users(id)
  name          text not null            -- "Standart kahvaltı", "Antrenman sonrası"
  items         jsonb not null           -- [{name, grams, calories, protein}, ...]
  created_at    timestamptz default now()
  INDEX(user_id)
```

**Not:** kalori/protein günlük toplamları `food_entries`'ten hesaplanır (tek doğru
kaynak). Kafein `days`'teki kahve sayılarından türetilir. Bu, mevcut frontend
mantığıyla birebir uyumlu.

---

## 4. API Endpointleri

Tümü JWT cookie ile korunur (auth endpointleri hariç).

```
# Auth
GET  /api/auth/google              -> Google'a yönlendir
GET  /api/auth/google/callback     -> token değişimi, cookie set, app'e dönüş
POST /api/auth/logout              -> cookie temizle
GET  /api/me                       -> oturumdaki kullanıcı / 401

# Günlük veri
GET  /api/day/:date                -> gün + yemekleri + türetilmiş toplamlar
PATCH /api/day/:date               -> steps/water/coffee/sleep/weight güncelle (upsert)
GET  /api/history?days=7           -> son N gün özet (grafik için)
GET  /api/range?from=&to=          -> tarih aralığı (geçmiş görünümü / takvim)

# Yemekler
POST   /api/day/:date/foods        -> yemek ekle {name, grams, calories, protein, source}
DELETE /api/foods/:id              -> yemek sil

# Hedefler
GET   /api/goals                   -> hedefleri getir
PATCH /api/goals                   -> hedef güncelle

# Öğün kısayolları (preset)
GET    /api/presets                -> kullanıcının kayıtlı öğün kısayolları
POST   /api/presets                -> yeni kısayol {name, items[]} (bir günden de üretilebilir)
DELETE /api/presets/:id            -> kısayol sil
POST   /api/day/:date/apply-preset/:id  -> kısayoldaki tüm kalemleri o güne ekle

# Zaten var (korunacak)
GET  /api/off-search?q=            -> Open Food Facts proxy
POST /api/ai-meal                  -> Claude ile öğün ayrıştırma

# Migrasyon
POST /api/import                   -> localStorage export JSON'unu DB'ye aktar
```

---

## 5. Dosya Yapısı (öneri)

```
health-tracker/
  server/
    index.js            # express app, route montaj
    db/
      schema.js         # drizzle şema
      client.js         # drizzle + pg pool
      migrate.js        # migration runner
    auth/
      google.js         # OAuth akışı
      middleware.js     # JWT doğrulama (requireAuth)
    routes/
      day.js
      foods.js
      goals.js
      off.js            # mevcut OFF proxy taşınır
      ai.js             # mevcut ai-meal taşınır
      importExport.js
  src/                  # mevcut frontend
    api/
      client.js         # fetch wrapper (401'de login'e yönlendir)
      useDailyData.js   # localStorage yerine API kullanacak şekilde revize
    components/
      LoginScreen.jsx   # yeni: Google ile giriş
      HistoryView.jsx   # yeni: geçmiş günler / takvim
  drizzle/              # migration dosyaları
  BACKEND_PLAN.md       # bu doküman
```

---

## 6. Frontend Değişiklikleri

- **`useDailyData`** → API tabanlı. Strateji: **offline-first cache**
  - Açılışta localStorage'dan hızlı göster, arka planda API'den çek + senkronize et
  - Yazma işlemleri optimistic + API'ye POST/PATCH; hata olursa geri al
- **Giriş ekranı** (`LoginScreen`): oturum yoksa "Google ile giriş" butonu
- **Geçmiş görünümü** (`HistoryView`): **takvim** — her günün kalori/protein toplamı
  hücrede görünür, hücreye tıklayınca o günün detayına (yemek listesi) gidilir.
  Varsayılan olarak son 1 ay gösterilir (veri silinmez, sadece görünüm sınırlı).
- **Öğün kısayolları** (`MealPresets`): sık yenen öğünleri kaydet, tek tıkla o güne
  ekle. Her seferinde yeniden hesaplamaya/aramaya gerek kalmaz. Geçmişteki bir günü
  de "kısayola dönüştür" ile preset yapabilirsin.
- Mevcut kartlar/AI/OFF akışı aynı kalır, sadece veri kaynağı değişir

---

## 7. Veri Migrasyonu (mevcut veriyi kaybetmeme)

Az önce eklediğimiz **export/import** özelliği migrasyon köprüsü:
1. Mevcut app'ten "💾 Yedek indir" ile JSON al
2. Yeni sürümde giriş yap
3. "📥 Yedek yükle" → frontend JSON'u `POST /api/import`'a gönderir
4. Backend `days` + `food_entries` + `goals` tablolarına yazar (upsert)

---

## 8. Aşamalı Uygulama Sırası

0. **Yeni repo oluştur** — `health-tracker` adında temiz bir full-stack repo;
   mevcut workshop repo'sundan yeniden kullanılacak kodu (React app, OFF proxy,
   AI meal, food DB) taşı. Bu `BACKEND_PLAN.md`'yi de yeni repoya kopyala.
1. **Postgres kurulumu** — Railway'de DB servisi ekle, `DATABASE_URL` bağla
2. **Drizzle şema + ilk migration** — tabloları oluştur (meal_presets dahil)
3. **Google OAuth** — FLM client'ına redirect URI ekle, auth akışı + `requireAuth`
4. **API endpointleri** — day / foods / goals / history / range / presets
5. **Mevcut endpointleri taşı** — off-search + ai-meal `routes/`e
6. **Frontend auth** — login ekranı + 401 yönlendirme
7. **Frontend veri katmanı** — `useDailyData` API'ye bağla (offline cache)
8. **Import** — localStorage yedeğini DB'ye aktarma
9. **Geçmiş görünümü** — takvim ekranı (günlük kcal/protein + detay)
10. **Öğün kısayolları** — preset kaydet/uygula UI
11. **Test + deploy** — uçtan uca doğrulama, Railway'e çıkış

---

## 9. Kararlar (kesinleşti)

- **DB katmanı: Drizzle ORM.** Tip güvenliği + migration'ı Prisma ağırlığı olmadan
  verir, SQL'e yakın kalır. Aynı desen diğer projelerde de kullanılabilir.
- **Google OAuth: FLM'nin OAuth client'ı tüm app'lerde ortak.** Etsy, FLM portalı,
  health-tracker ve ileride yapılacak app'ler aynı client'ı kullanır; her app kendi
  redirect URI'sini ekler ve kendi e-posta allowlist'iyle erişimi kısıtlar.
  (Not: bu "ortak kimlik sağlayıcı"dır, gerçek SSO değil — her app kendi giriş
  butonunu gösterir ama Google oturumu hatırladığı için pratikte tek tık. Gerçek
  SSO ileride gerekirse ayrı bir auth servisi olarak çıkarılır.)
- **Geçmiş görünümü: takvim.** Her gün kcal/protein toplamı, tıkla → detay.
  Varsayılan 1 ay görünüm. **Veri silinmez** (depolama bedava, kilo trendi değerli);
  1 ay yalnızca varsayılan görünüm sınırı.
- **Öğün kısayolları (preset):** sık yenen öğünleri kaydet, tek tıkla ekle.
  Geçmişteki bir gün "kısayola dönüştür" ile preset olabilir.
- **Offline: yazmaya izin ver, sonra sync (düşük öncelik).** Önce online-first
  çalışan sürümü çıkar, offline sync sonradan eklenebilir.
- **Repo: YENİ repo (full-stack).** Frontend + backend + DB aynı repoda, tek deploy.
  Mevcut workshop repo'su referans kalır; yeni repo temiz başlar.
