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
- FLM projesinde kurulu Google Cloud OAuth client'ı yeniden kullan.
- Health-tracker'ın redirect URI'sini o client'ın "Authorized redirect URIs"
  listesine ekle: `https://health-tracker-production-23fe.up.railway.app/api/auth/google/callback`
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
  source        text  default 'manual'  -- 'local' | 'online' | 'manual' | 'ai'
  created_at    timestamptz default now()
  INDEX(user_id, date)
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
- **Geçmiş görünümü** (`HistoryView`): takvim/liste ile geçmiş günlere bakma —
  senin asıl istediğin "dün ne yedim" özelliği
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

1. **Postgres kurulumu** — Railway'de DB servisi ekle, `DATABASE_URL` bağla
2. **Drizzle şema + ilk migration** — tabloları oluştur
3. **Google OAuth** — FLM client'ına redirect URI ekle, auth akışı + `requireAuth`
4. **API endpointleri** — day / foods / goals / history / range
5. **Mevcut endpointleri taşı** — off-search + ai-meal `routes/`e
6. **Frontend auth** — login ekranı + 401 yönlendirme
7. **Frontend veri katmanı** — `useDailyData` API'ye bağla (offline cache)
8. **Import** — localStorage yedeğini DB'ye aktarma
9. **Geçmiş görünümü** — takvim/liste ekranı
10. **Test + deploy** — uçtan uca doğrulama, Railway'e çıkış

---

## 9. Açık Sorular / Onaylanacaklar

- [ ] DB katmanı: **Drizzle** (öneri) mi, ham `pg` mi, Prisma mı?
- [ ] Google OAuth: FLM client'ını **yeniden kullan** (öneri) mı, health-tracker'a
      **yeni bir OAuth client** mı açalım?
- [ ] Geçmiş görünümü: takvim mi, basit tarih listesi mi, ikisi de mi?
- [ ] Offline davranışı: internet yokken yazmaya izin verip sonra sync mi,
      yoksa online zorunlu mu? (kişisel kullanım için offline-first öneri)
- [ ] Bu iş yeni bir repo mu olsun, mevcut health-tracker repo'sunda mı kalsın?
      (öneri: mevcut repo — app ile backend aynı yerde, tek deploy)
