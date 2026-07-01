# `backend` — Ortak Backend + DB Planı

> Amaç: Tek bir ortak backend servisi + veritabanı kurmak; health-tracker, Etsy portalı,
> FLM portalı ve ileride yapılacak app'ler bu servisi kullansın. Veriler kalıcı olsun,
> geçmişe bakılabilsin, app'ler günlük gerçek kullanıma uygun hale gelsin.
>
> **Not:** Bu doküman şimdilik health-tracker repo'sunda duruyor; yeni `backend` repo'su
> kurulduğunda oraya taşınacak. İlk somut kullanıcı (ve migrasyon testi) health-tracker.

## 1. Mimari Kararı

**Tek ortak backend repo'su (`backend`) + tek Postgres.** Tüm kişisel app'ler (health,
etsy, flm, gelecek) bu servisi kullanır. **Ama veri alanları ayrıktır** — her app kendi
Postgres schema'sında yaşar, tabloları paylaşmazlar.

- **Ortak olan:** sunucu altyapısı, DB bağlantısı, Google OAuth, deploy, ortak yardımcılar
- **Ayrık olan:** domain tabloları (her app kendi Postgres schema'sında), route namespace'i

**Neden ortak backend (tek geliştirici için doğru):** Tek kişi birkaç küçük kişisel app
işletiyor. Tek servis + tek DB + tek auth = çok daha az bakım ve maliyet. "Ayrı ayrı
backend" önerisi ekip/koordinasyon bağlamında geçerli; solo'da ops tasarrufu coupling
riskinden ağır basar. Coupling'i de schema ayrımıyla düşük tutuyoruz.

**Frontend'ler ayrı repolarda kalır** (health-tracker frontend'i mevcut repo'sunda,
etsy portalı kendi repo'sunda). Hepsi `backend`'e API çağrısı yapar.

### Stack
- **Runtime:** Node.js + Express (yeni `backend` repo'sunda; health-tracker'ın mevcut
  `server.js`'indeki OFF proxy + AI meal mantığı buraya taşınır)
- **DB:** PostgreSQL (Railway tek tık, `DATABASE_URL` env), **app başına Postgres schema**
- **DB katmanı:** Drizzle ORM (tipli şema + migration'lar)
- **Auth:** Google OAuth + e-posta allowlist, **bearer token** (cross-origin için)
- **LLM:** ortak `llm` servisi — Claude (Anthropic) + OpenAI anahtarları tek yerde
- **Route namespace:** `/api/health/*`, `/api/etsy/*`, `/api/flm/*`, ortak `/api/auth/*`
- **Frontend:** her app kendi repo'sunda; health-tracker React PWA localStorage yerine
  `backend` API'sini çağırır (localStorage offline cache olarak kalabilir)
- **Hosting:** Railway (yeni `backend` servisi + Postgres)

### Ortak servis katmanı (tüm app'lerin paylaştığı çekirdek)
Bu katman backend'de bir kez yazılır, tüm app modülleri (health/etsy/flm/gelecek) çağırır:

1. **Kimlik (`auth`)** — Google OAuth + bearer token + `requireAuth` middleware
2. **Veritabanı (`db`)** — tek Drizzle/pg bağlantısı; her app kendi schema'sında
3. **LLM (`llm`)** — **Claude + OpenAI istemcileri ve API anahtarları tek yerde.**
   - Anahtarlar yalnızca backend env'inde: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
   - Frontend'ler ve ayrı repolar anahtarı **hiç görmez** — hepsi backend'e istek atar
   - Ortak yardımcı: `llm.claude({...})`, `llm.openai({...})` — model/parametre seçimi
     çağrı yerinde yapılır (örn. health'te Haiku, etsy'de daha büyük model)
   - Tek noktada: kota/limit, hata yönetimi, log, ileride maliyet takibi
4. **Ortak yardımcılar** — CORS, hata biçimi, doğrulama vb.

**Yeni proje eklemek** (örn. ileride başka bir app): yeni bir Postgres schema + yeni bir
`modules/<app>/` route klasörü aç, ortak `auth`/`db`/`llm` servislerini import et. Anahtar
kopyalamak, ayrı auth kurmak, ayrı LLM istemcisi yazmak gerekmez.

---

## 2. Kimlik / Auth

### Yaklaşım: "Tek ortak kimlik, tek backend'de"
- FLM projesinde kurulu Google Cloud OAuth client'ı **tüm app'lerde** yeniden kullanılır.
  Ortak `backend` tek OAuth akışını barındırır; her frontend ona yönlenir.
- Her frontend'in dönüş URL'si OAuth client'ın "Authorized redirect URIs" listesine
  eklenir. Callback ortak: `https://<backend-railway-domain>/api/auth/google/callback`
- Backend Google'dan dönen token'ı doğrular, e-postayı okur.
- **Allowlist:** yalnızca `ALLOWED_EMAILS` env'indeki e-posta(lar) girebilir (şimdilik
  sadece sen). App bazında farklı allowlist gerekirse ileride app'e özel kontrol eklenir.

### Cross-origin auth — çerez yerine bearer token
Backend ile frontend'ler farklı domain'lerde olduğu için httpOnly cookie "cross-site"
olur ve zahmetlidir. Bunun yerine:
- Girişte backend bir **JWT** üretir, frontend'e döner.
- Frontend token'ı saklar (localStorage) ve her istekte `Authorization: Bearer <token>`
  header'ıyla gönderir.
- Backend `requireAuth` middleware'i bu header'ı doğrular.
- CORS: backend yalnızca bilinen frontend origin'lerine izin verir (env ile allowlist).

### Akış
1. Kullanıcı frontend'te "Google ile giriş" → `backend`'in `/api/auth/google`'ına gider
2. Google onay → `/api/auth/google/callback?code=...`
3. Backend code'u token'a çevirir, e-postayı alır, allowlist kontrolü
4. `auth.users` tablosunda upsert → **JWT üret** → frontend'e döner (token)
5. Frontend token'ı saklar; açılışta `/api/me` ile doğrular, yoksa giriş ekranı gösterir

### Gerekli env değişkenleri (backend servisi)
```
DATABASE_URL=...            # Railway Postgres otomatik verir
GOOGLE_CLIENT_ID=...        # FLM'den
GOOGLE_CLIENT_SECRET=...    # FLM'den
GOOGLE_REDIRECT_URI=https://<backend-domain>/api/auth/google/callback
ALLOWED_EMAILS=idildadan@gmail.com
ALLOWED_ORIGINS=https://<health-frontend>,https://<etsy-frontend>  # CORS
JWT_SECRET=...              # rastgele uzun string
ANTHROPIC_API_KEY=...       # ORTAK — tüm app'lerin Claude çağrıları
OPENAI_API_KEY=...          # ORTAK — tüm app'lerin OpenAI çağrıları
```

**Not:** LLM anahtarları artık her repoda ayrı ayrı durmaz; yalnızca bu backend'de
tanımlıdır. Health, Etsy, FLM ve gelecek app'ler ortak `llm` servisi üzerinden kullanır.

---

## 3. Veritabanı Şeması

Tek Postgres, **app başına Postgres schema**. Ortak kimlik `auth` schema'sında; her app
kendi schema'sında. Tablolar app'ler arası paylaşılmaz; sadece `auth.users`'a FK ile
bağlanırlar.

```
=== schema: auth (ortak, tüm app'ler) ===

auth.users
  id            uuid PK (default gen_random_uuid)
  email         text unique not null
  name          text
  picture       text
  created_at    timestamptz default now()

=== schema: health (yalnızca health-tracker) ===

health.goals                -- kullanıcı başına tek satır
  user_id       uuid PK FK -> auth.users(id)
  steps         int   default 8000
  water         int   default 2000     -- ml
  caffeine      real  default 3        -- doz
  calories      int   default 2000
  protein       int   default 100      -- g
  sleep         real  default 8        -- saat
  weight        real  default 70       -- kg (hedef)
  updated_at    timestamptz default now()

health.days                 -- kullanıcı + tarih başına tek satır (KALICI, küçük)
  id            uuid PK
  user_id       uuid FK -> auth.users(id)
  date          date not null          -- YYYY-MM-DD (kullanıcının yerel günü)
  steps         int   default 0
  water         int   default 0
  turkish_coffee int  default 0
  filter_coffee int   default 0
  sleep         real  default 0
  weight        real  default 0
  calories_total int  default 0        -- günlük snapshot; food_entries silinse de kalır
  protein_total  real default 0        -- günlük snapshot; food_entries silinse de kalır
  updated_at    timestamptz default now()
  UNIQUE(user_id, date)
  -- caffeine türetilmiş: turkish_coffee*0.5 + filter_coffee*1.25

health.food_entries         -- güne bağlı yemek kalemleri
  id            uuid PK
  user_id       uuid FK -> auth.users(id)
  date          date not null
  name          text not null
  grams         real                    -- null olabilir (manuel/AI kalemleri)
  calories      int   not null
  protein       real  not null
  source        text  default 'manual'  -- 'local' | 'online' | 'manual' | 'ai' | 'preset'
  created_at    timestamptz default now()
  INDEX(user_id, date)

health.meal_presets         -- sık yenen öğünlerin kısayolu (tek tıkla eklemek için)
  id            uuid PK
  user_id       uuid FK -> auth.users(id)
  name          text not null            -- "Standart kahvaltı", "Antrenman sonrası"
  items         jsonb not null           -- [{name, grams, calories, protein}, ...]
  created_at    timestamptz default now()
  INDEX(user_id)

=== schema: etsy, flm (ayrı, gerektiğinde) ===
  # Her app kendi tablolarını kendi schema'sında tanımlar; health tablolarıyla
  # ilişkileri yoktur, sadece auth.users'a bağlanırlar.
```

**Kalori/protein toplamı — çift kayıt:** Bir yemek eklendiğinde/silindiğinde o günün
`food_entries` toplamı hesaplanıp `days.calories_total` / `days.protein_total`'a yazılır.
Böylece detay kalemler (food_entries) 1 ay sonra silinse bile günlük toplam korunur.
Aktif günde detay food_entries'ten gelir; eski günlerde snapshot rakamı gösterilir.

**Veri saklama (retention) — DB'yi şişirmemek için:**
- `days` ve `meal_presets` → **kalıcı** (küçük, günde 1 satır). Kilo trendi, günlük
  kalori/protein toplamları hep durur, takvimde rakam olarak görünür.
- `food_entries` (detay kalemler, asıl büyüyen tablo) → **~35 günden eskiler silinir**.
  Yöntem: her yemek yazımında (lazy prune) `WHERE user_id=? AND date < now-35d` sil.
  Cron'a gerek yok. Son ~1 ayda gün detayına bakılır; öncesinde sadece toplam kalır.

Kafein `days`'teki kahve sayılarından türetilir. Mevcut frontend mantığıyla uyumlu.

---

## 4. API Endpointleri

App bazında namespace. Ortak `/api/auth/*` hariç tümü `Authorization: Bearer <token>`
ile korunur. Health endpointleri `/api/health/*` altında; etsy/flm ileride kendi
namespace'inde.

```
# Auth (ortak)
GET  /api/auth/google              -> Google'a yönlendir
GET  /api/auth/google/callback     -> token değişimi, JWT üret + frontend'e dön
GET  /api/me                       -> token'daki kullanıcı / 401

# --- Health namespace: /api/health/* ---

# Günlük veri
GET   /api/health/day/:date        -> gün + yemekleri + türetilmiş toplamlar
PATCH /api/health/day/:date        -> steps/water/coffee/sleep/weight güncelle (upsert)
GET   /api/health/history?days=7   -> son N gün özet (grafik için)
GET   /api/health/range?from=&to=  -> tarih aralığı (geçmiş / takvim)

# Yemekler
POST   /api/health/day/:date/foods -> yemek ekle {name, grams, calories, protein, source}
DELETE /api/health/foods/:id       -> yemek sil

# Hedefler
GET   /api/health/goals            -> hedefleri getir
PATCH /api/health/goals            -> hedef güncelle

# Öğün kısayolları (preset)
GET    /api/health/presets                     -> kayıtlı öğün kısayolları
POST   /api/health/presets                     -> yeni kısayol {name, items[]}
DELETE /api/health/presets/:id                 -> kısayol sil
POST   /api/health/day/:date/apply-preset/:id  -> kısayolu o güne ekle

# Health yardımcı servisleri (mevcut server.js'ten taşınır)
GET  /api/health/off-search?q=     -> Open Food Facts proxy
POST /api/health/ai-meal           -> Claude ile öğün ayrıştırma

# Migrasyon
POST /api/health/import            -> localStorage export JSON'unu DB'ye aktar

# --- Etsy / FLM namespace: /api/etsy/*, /api/flm/* (ileride) ---
```

---

## 5. Dosya Yapısı (öneri)

**İki ayrı repo:** `backend` (ortak servis) ve `health-tracker` (mevcut frontend repo'su).

```
backend/                    # YENİ repo — ortak servis
  index.js                  # express app, CORS, route montaj
  db/
    client.js               # drizzle + pg pool
    migrate.js              # migration runner
    schema/
      auth.js               # auth.users (ortak)
      health.js             # health.* tablolar
      etsy.js               # (ileride) etsy.* tablolar
  auth/
    google.js               # OAuth akışı (ortak)
    middleware.js           # requireAuth — Bearer token doğrulama
  lib/                      # ORTAK servisler (tüm modüller import eder)
    llm.js                  # Claude + OpenAI istemcileri; anahtarlar tek yerde
    cors.js                 # CORS origin allowlist
    errors.js               # ortak hata biçimi
  modules/
    health/
      day.js
      foods.js
      goals.js
      presets.js
      off.js                # OFF proxy (health-tracker'dan taşınır)
      ai.js                 # ai-meal — lib/llm.js'i kullanır
      import.js
    etsy/                   # (ileride) lib/llm.js'i kullanır
    flm/                    # (ileride) lib/llm.js'i kullanır
  drizzle/                  # migration dosyaları
  BACKEND_PLAN.md           # bu doküman (buraya taşınır)

health-tracker/             # MEVCUT repo — sadece frontend'e evrilir
  src/
    api/
      client.js             # fetch wrapper: Bearer token ekler, 401'de login'e yönlendir
      useDailyData.js       # localStorage yerine backend API'sini kullanır
    components/
      LoginScreen.jsx       # yeni: Google ile giriş
      HistoryView.jsx       # yeni: takvim / geçmiş
      MealPresets.jsx       # yeni: öğün kısayolları
```

---

## 6. Frontend Değişiklikleri

- **`useDailyData`** → API tabanlı. Strateji: **offline-first cache**
  - Açılışta localStorage'dan hızlı göster, arka planda API'den çek + senkronize et
  - Yazma işlemleri optimistic + API'ye POST/PATCH; hata olursa geri al
- **Giriş ekranı** (`LoginScreen`): oturum yoksa "Google ile giriş" butonu
- **Geçmiş görünümü** (`HistoryView`): **takvim** — her günün kalori/protein toplamı
  ve kilosu hücrede rakam olarak görünür (kalıcı snapshot'tan, tüm geçmiş için).
  Son ~1 aydaki bir hücreye tıklayınca o günün **yemek detayı** açılır; daha eski
  günlerde detay silinmiş olur, sadece toplam rakam gösterilir. Kilo trendi için
  ayrıca uzun vadeli bir grafik gösterilebilir.
- **Öğün kısayolları** (`MealPresets`): sık yenen öğünleri kaydet, tek tıkla o güne
  ekle. Her seferinde yeniden hesaplamaya/aramaya gerek kalmaz. Geçmişteki bir günü
  de "kısayola dönüştür" ile preset yapabilirsin.
- Mevcut kartlar/AI/OFF akışı aynı kalır, sadece veri kaynağı değişir

---

## 7. Veri Migrasyonu (mevcut veriyi kaybetmeme)

Az önce eklediğimiz **export/import** özelliği migrasyon köprüsü:
1. Mevcut app'ten "💾 Yedek indir" ile JSON al
2. Yeni sürümde Google ile giriş yap
3. "📥 Yedek yükle" → frontend JSON'u `POST /api/health/import`'a gönderir
4. Backend `health.days` + `health.food_entries` + `health.goals`'a yazar (upsert)

---

## 8. Aşamalı Uygulama Sırası

**A. Ortak backend (yeni `backend` repo'su)**
0. **`backend` repo'sunu oluştur** — Express iskeleti, CORS, bu `BACKEND_PLAN.md`'yi taşı
1. **Railway'de yeni servis + Postgres** — `DATABASE_URL` bağla
2. **Drizzle kurulumu + schema'lar** — `auth`, `health` schema'ları + ilk migration
3. **Google OAuth (ortak)** — FLM client'ına backend callback URI'si ekle, Bearer token
   üretimi + `requireAuth` middleware + CORS origin allowlist
4. **Health modülü endpointleri** — day / foods / goals / history / range / presets
5. **Mevcut servisleri taşı** — health-tracker `server.js`'teki off-search + ai-meal →
   `modules/health/`
6. **Import endpoint** — localStorage yedeğini DB'ye aktarma

**B. Health-tracker frontend (mevcut repo)**
7. **API istemci katmanı** — `api/client.js` (Bearer token), `useDailyData` backend'e bağlı
8. **Giriş ekranı** — Google ile giriş + 401 yönlendirme
9. **Import akışı** — mevcut yedeği backend'e aktar, doğrula
10. **Geçmiş görünümü** — takvim (günlük kcal/protein + kilo, son 1 ay detay)
11. **Öğün kısayolları** — preset kaydet/uygula UI
12. **Test + deploy** — uçtan uca doğrulama, Railway'e çıkış

---

## 9. Kararlar (kesinleşti)

- **Mimari: tek ortak `backend` repo'su + tek Postgres.** health/etsy/flm hepsi bu
  servisi kullanır; veri app başına ayrı **Postgres schema**'sında (tablolar paylaşılmaz).
  Tek geliştirici için ops/maliyet tasarrufu coupling riskinden ağır basar.
- **DB katmanı: Drizzle ORM.** Tip güvenliği + migration, Prisma ağırlığı olmadan.
- **Veri ayrımı: Postgres schema'lar.** `auth` (ortak), `health`, `etsy`, `flm` (ayrı).
- **Google OAuth: FLM client'ı tüm app'lerde ortak,** ortak backend'de tek akış.
  Erişim `ALLOWED_EMAILS` allowlist (şimdilik tek kişi).
- **LLM anahtarları merkezî.** Claude + OpenAI anahtarları yalnızca backend env'inde
  (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`); ortak `lib/llm.js` üzerinden tüm app'ler
  kullanır. Repolarda dağınık anahtar yok; tek noktada limit/hata/log/maliyet takibi.
- **Genişletilebilirlik:** yeni proje = yeni Postgres schema + yeni `modules/<app>/`;
  ortak `auth`/`db`/`llm` servisleri import edilir, tekrar kurulmaz.
- **Auth taşıma: Bearer token** (cross-origin olduğu için cookie değil). Frontend
  token'ı saklar, `Authorization` header'ıyla gönderir. CORS origin allowlist ile korunur.
- **Route namespace:** `/api/health/*`, `/api/etsy/*`, `/api/flm/*`, ortak `/api/auth/*`.
- **Geçmiş + retention: takvim, hibrit saklama.** Günlük kcal/protein toplamı + kilo
  kalıcı (days snapshot); yemek detayı (food_entries) ~35 gün sonra silinir.
- **Öğün kısayolları (preset):** sık yenen öğünleri kaydet, tek tıkla ekle.
- **Offline: yazmaya izin ver, sonra sync (düşük öncelik).** Önce online-first.
- **Repolar: `backend` YENİ (ortak servis+DB), `health-tracker` MEVCUT repo frontend'e
  evrilir.** Frontend'ler ayrı repolarda kalır, ortak backend'e API ile bağlanır.
