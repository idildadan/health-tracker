// Kalori/protein değerleri 100g üzerinden yaklaşık değerlerdir.
// unit: kullanıcının tek tıkla ekleyebileceği yaygın porsiyon (gram karşılığı)
export const FOODS = [
  { id: 'yumurta', name: 'Yumurta (haşlanmış)', kcal100: 155, protein100: 13, unit: { label: '1 adet', grams: 50 } },
  { id: 'tavuk-gogsu', name: 'Tavuk göğsü (ızgara)', kcal100: 165, protein100: 31, unit: { label: '1 porsiyon', grams: 150 } },
  { id: 'yogurt', name: 'Yoğurt (yarım yağlı)', kcal100: 63, protein100: 3.5, unit: { label: '1 kase', grams: 200 } },
  { id: 'beyaz-peynir', name: 'Beyaz peynir', kcal100: 264, protein100: 18, unit: { label: '1 dilim', grams: 30 } },
  { id: 'ekmek', name: 'Ekmek (beyaz)', kcal100: 265, protein100: 9, unit: { label: '1 dilim', grams: 30 } },
  { id: 'tam-bugday-ekmek', name: 'Ekşi mayalı tam buğday ekmeği', kcal100: 247, protein100: 13, unit: { label: '1 dilim', grams: 30 } },
  { id: 'pirinc-pilavi', name: 'Pirinç pilavı', kcal100: 130, protein100: 2.4, unit: { label: '1 porsiyon', grams: 150 } },
  { id: 'makarna', name: 'Makarna (haşlanmış)', kcal100: 131, protein100: 5, unit: { label: '1 porsiyon', grams: 200 } },
  { id: 'mercimek-corbasi', name: 'Mercimek çorbası', kcal100: 90, protein100: 5, unit: { label: '1 kase', grams: 250 } },
  { id: 'muz', name: 'Muz', kcal100: 89, protein100: 1.1, unit: { label: '1 adet', grams: 120 } },
  { id: 'elma', name: 'Elma', kcal100: 52, protein100: 0.3, unit: { label: '1 adet', grams: 150 } },
  { id: 'badem', name: 'Badem', kcal100: 579, protein100: 21, unit: { label: '1 avuç', grams: 30 } },
  { id: 'ceviz', name: 'Ceviz', kcal100: 654, protein100: 15, unit: { label: '1 avuç', grams: 30 } },
  { id: 'somon', name: 'Somon (ızgara)', kcal100: 208, protein100: 20, unit: { label: '1 porsiyon', grams: 150 } },
  { id: 'kirmizi-et', name: 'Kırmızı et (ızgara)', kcal100: 250, protein100: 26, unit: { label: '1 porsiyon', grams: 150 } },
  { id: 'mercimek', name: 'Mercimek (pişmiş)', kcal100: 116, protein100: 9, unit: { label: '1 porsiyon', grams: 150 } },
  { id: 'nohut', name: 'Nohut (pişmiş)', kcal100: 164, protein100: 8.9, unit: { label: '1 porsiyon', grams: 150 } },
  { id: 'protein-tozu', name: 'Whey protein tozu (şekersiz, katkısız)', kcal100: 370, protein100: 80, unit: { label: '1 ölçek', grams: 30 } },
  { id: 'avokado', name: 'Avokado', kcal100: 160, protein100: 2, unit: { label: '1/2 adet', grams: 100 } },
  { id: 'zeytinyagi', name: 'Zeytinyağı', kcal100: 884, protein100: 0, unit: { label: '1 yemek kaşığı', grams: 14 } },

  // Kahvaltılık
  { id: 'simit', name: 'Simit', kcal100: 275, protein100: 8.5, unit: { label: '1 adet', grams: 100 } },
  { id: 'poğaça', name: 'Poğaça (peynirli)', kcal100: 330, protein100: 7, unit: { label: '1 adet', grams: 80 } },
  { id: 'kasar-peyniri', name: 'Kaşar peyniri', kcal100: 350, protein100: 25, unit: { label: '1 dilim', grams: 25 } },
  { id: 'tereyagi', name: 'Tereyağı', kcal100: 717, protein100: 0.9, unit: { label: '1 tatlı kaşığı', grams: 10 } },
  { id: 'bal', name: 'Bal', kcal100: 304, protein100: 0.3, unit: { label: '1 tatlı kaşığı', grams: 20 } },
  { id: 'reçel', name: 'Reçel', kcal100: 278, protein100: 0.4, unit: { label: '1 tatlı kaşığı', grams: 20 } },
  { id: 'zeytin-siyah', name: 'Siyah zeytin', kcal100: 115, protein100: 0.8, unit: { label: '5 adet', grams: 25 } },
  { id: 'sucuk', name: 'Sucuk (kızartılmış)', kcal100: 380, protein100: 21, unit: { label: '3 dilim', grams: 50 } },
  { id: 'menemen', name: 'Menemen', kcal100: 120, protein100: 6, unit: { label: '1 porsiyon', grams: 200 } },
  { id: 'granola', name: 'Granola/müsli', kcal100: 400, protein100: 9, unit: { label: '1 kase', grams: 50 } },

  // Çorbalar
  { id: 'yayla-corbasi', name: 'Yayla çorbası', kcal100: 70, protein100: 3, unit: { label: '1 kase', grams: 250 } },
  { id: 'domates-corbasi', name: 'Domates çorbası', kcal100: 55, protein100: 1.5, unit: { label: '1 kase', grams: 250 } },
  { id: 'ezogelin-corbasi', name: 'Ezogelin çorbası', kcal100: 75, protein100: 4, unit: { label: '1 kase', grams: 250 } },
  { id: 'tavuk-corbasi', name: 'Tavuk suyu çorba', kcal100: 50, protein100: 5, unit: { label: '1 kase', grams: 250 } },

  // Ana yemekler
  { id: 'kuru-fasulye', name: 'Kuru fasulye', kcal100: 130, protein100: 8, unit: { label: '1 porsiyon', grams: 200 } },
  { id: 'karniyarik', name: 'Karnıyarık', kcal100: 150, protein100: 7, unit: { label: '1 porsiyon', grams: 250 } },
  { id: 'izgara-kofte', name: 'Izgara köfte', kcal100: 220, protein100: 20, unit: { label: '4 adet', grams: 150 } },
  { id: 'tavuk-sote', name: 'Tavuk sote', kcal100: 140, protein100: 18, unit: { label: '1 porsiyon', grams: 200 } },
  { id: 'mantı', name: 'Mantı (yoğurtlu)', kcal100: 210, protein100: 8, unit: { label: '1 porsiyon', grams: 250 } },
  { id: 'lahmacun', name: 'Lahmacun', kcal100: 250, protein100: 11, unit: { label: '1 adet', grams: 150 } },
  { id: 'pide-kiymali', name: 'Kıymalı pide', kcal100: 260, protein100: 12, unit: { label: '1 dilim', grams: 150 } },
  { id: 'döner', name: 'Tavuk döner (ekmeksiz)', kcal100: 215, protein100: 22, unit: { label: '1 porsiyon', grams: 200 } },
  { id: 'balik-izgara', name: 'Izgara balık', kcal100: 180, protein100: 22, unit: { label: '1 porsiyon', grams: 180 } },
  { id: 'sebze-yemegi', name: 'Zeytinyağlı sebze yemeği', kcal100: 95, protein100: 2.5, unit: { label: '1 porsiyon', grams: 200 } },
  { id: 'patates-kizartma', name: 'Patates kızartması', kcal100: 312, protein100: 3.4, unit: { label: '1 porsiyon', grams: 150 } },
  { id: 'mercimek-kofte', name: 'Mercimek köftesi', kcal100: 150, protein100: 6, unit: { label: '4 adet', grams: 120 } },

  // Süt ürünleri ve ara öğün
  { id: 'sut', name: 'Süt (yarım yağlı)', kcal100: 47, protein100: 3.4, unit: { label: '1 bardak', grams: 200 } },
  { id: 'ayran', name: 'Ayran', kcal100: 38, protein100: 1.7, unit: { label: '1 bardak', grams: 200 } },
  { id: 'kefir', name: 'Kefir', kcal100: 56, protein100: 3.3, unit: { label: '1 bardak', grams: 200 } },
  { id: 'cacik', name: 'Cacık', kcal100: 55, protein100: 2.5, unit: { label: '1 kase', grams: 150 } },
  { id: 'süzme-yogurt', name: 'Süzme yoğurt (Yunan tipi)', kcal100: 97, protein100: 9, unit: { label: '1 kase', grams: 170 } },
  { id: 'lor-peyniri', name: 'Lor peyniri', kcal100: 98, protein100: 12, unit: { label: '1 porsiyon', grams: 100 } },
  { id: 'laktozsuz-sut', name: 'Laktozsuz süt', kcal100: 42, protein100: 3.4, unit: { label: '1 bardak', grams: 200 } },
  { id: 'kecisutu-dondurma', name: 'Keçi sütünden dondurma', kcal100: 200, protein100: 4, unit: { label: '1 kase', grams: 100 } },

  // Atıştırmalık ve tatlı
  { id: 'kuru-uzum', name: 'Kuru üzüm', kcal100: 299, protein100: 3, unit: { label: '1 avuç', grams: 30 } },
  { id: 'kuruyemis-karisik', name: 'Karışık kuruyemiş', kcal100: 600, protein100: 18, unit: { label: '1 avuç', grams: 30 } },
  { id: 'baklava', name: 'Baklava', kcal100: 430, protein100: 6, unit: { label: '1 dilim', grams: 60 } },
  { id: 'sutlac', name: 'Sütlaç', kcal100: 150, protein100: 3.5, unit: { label: '1 kase', grams: 150 } },
  { id: 'cikolata-bitter', name: 'Bitter çikolata', kcal100: 546, protein100: 5, unit: { label: '2 kare', grams: 20 } },
  { id: 'protein-bar', name: 'Protein bar', kcal100: 370, protein100: 25, unit: { label: '1 adet', grams: 50 } },

  // Diğer
  { id: 'yulaf', name: 'Yulaf (kuru)', kcal100: 389, protein100: 17, unit: { label: '1 kase', grams: 40 } },
  { id: 'ton-balik', name: 'Ton balığı (suda, süzülmüş)', kcal100: 116, protein100: 26, unit: { label: '1 konserve', grams: 120 } },
  { id: 'yesillik', name: 'Yeşillik (karışık salata)', kcal100: 20, protein100: 1.5, unit: { label: '1 kase', grams: 50 } },
  { id: 'konserve-misir', name: 'Konserve mısır', kcal100: 86, protein100: 3.3, unit: { label: '3 yemek kaşığı', grams: 50 } },
  { id: 'yaban-mersini', name: 'Yaban mersini', kcal100: 57, protein100: 0.7, unit: { label: '1 avuç', grams: 80 } },
  { id: 'laktozsuz-yogurt', name: 'Laktozsuz yoğurt', kcal100: 61, protein100: 3.5, unit: { label: '1 kase', grams: 200 } },
  { id: 'nohut-cipsi', name: 'Nohut cipsi', kcal100: 400, protein100: 18, unit: { label: '1 paket', grams: 30 } },
]

export function calcMacros(food, grams) {
  const ratio = grams / 100
  return {
    calories: Math.round(food.kcal100 * ratio),
    protein: Math.round(food.protein100 * ratio * 10) / 10,
  }
}
