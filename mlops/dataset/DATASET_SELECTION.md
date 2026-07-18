# Industrial Defect Dataset Comparison & MVP Stack

## Değerlendirme Kriterleri (0-10)

| Dataset             | Demo Kalitesi | Gerçekçilik | Eğitim Kolaylığı | YOLO Compat | Anomaly Det | Yatırımcı Etkisi | **TOPLAM** |
|---------------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **MVTec AD**        |  10 |  10 |   8 |   7 |  10 |  10 | **55** |
| **NEU Surface**     |   9 |   9 |  10 |  10 |   6 |   8 | **52** |
| **Severstal Steel** |   8 |  10 |   7 |   8 |   5 |   7 | **45** |
| DAGM                |   7 |   7 |   8 |   7 |   8 |   6 | **43** |
| KolektorSDD         |   7 |   8 |   8 |   8 |   7 |   6 | **44** |

---

## Detaylı Analiz

### 1. MVTec AD ✅ PRIMARY CHOICE
- **Ne:** 15 farklı endüstriyel kategori (metal nut, screw, tile, leather, wood, capsule vb.)
- **Boyut:** 5354 görüntü, pixel-level ground truth annotation
- **Format:** PNG, pixel mask + bounding box çıkartılabilir
- **Güçlü yönler:**
  - Görsel olarak çarpıcı — yatırımcı demosu için ideal
  - Çok kategorili — "farklı fabrikalara uyum" demo'su yapılabilir
  - Anomaly detection + classification her ikisi de mümkün
  - Akademik kabul görmüş benchmark → güvenilirlik
- **Zayıf yönler:**
  - YOLO formatına dönüştürme gerekli (mask → bbox)
  - Lisans: academic/non-commercial (demo için sorun değil)
- **MVP kullanımı:** Metal Nut + Screw kategorileri → "CNC/Metal fabrika" demo senaryosu

### 2. NEU Surface Defect Dataset ✅ SECONDARY CHOICE  
- **Ne:** Çelik yüzey defect sınıflandırması (6 sınıf: crazing, inclusion, patches, pitted_surface, rolled-in_scale, scratches)
- **Boyut:** 1800 görüntü (300/sınıf), XML annotation (VOC format)
- **Format:** BMP → PNG, VOC XML → YOLO kolayca dönüşür
- **Güçlü yönler:**
  - YOLO training için hazır annotation
  - 6 semantik anlamlı defect sınıfı
  - Real steel factory görüntüleri → gerçekçilik
  - "Çelik fabrika" demo senaryosu
- **MVP kullanımı:** Binary (pass/fail) + multi-class detection

### 3. Severstal Steel (Kaggle) — OPTIONAL
- **Ne:** Kaggle competition dataset, run-length encoding mask
- **Boyut:** ~12,568 etiketli görüntü
- **Güçlü yönler:** Büyük → fine-tuning için iyi
- **Zayıf yönler:** RLE mask → bbox dönüşüm karmaşık, lisans kısıtlı
- **MVP kullanımı:** İkinci aşama fine-tuning (demo'da değil)

### 4. KolektorSDD — FUTURE USE
- Binary surface defect, 50/50 split, yüksek quality
- Anomaly detection başlangıcı için iyi ama az görüntü

---

## MVP Dataset Stack (Karar)

```
PRIMARY:   MVTec AD → Metal Nut + Screw sınıfları
SECONDARY: NEU Surface Defect → 6-class steel detection
DEMO TIER: MVTec visual quality → investor presentation
TRAIN TIER: NEU annotation quality → YOLO fine-tuning
```

### Neden bu kombinasyon?
1. MVTec → görsel etki, demo appeal, çok kategorili
2. NEU → gerçek YOLO training için annotation kalitesi
3. İkisi birlikte → "farklı fabrika tiplerini destekliyoruz" narrative'i
4. Her ikisi de gelecekte fabrika verisinin yerini kolayca alabileceği format
