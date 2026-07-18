# MVP AI Strategy — Technical & Business Analysis

## Soru: Hangi AI yaklaşımıyla başlanmalı?

### A) Binary Classification (good / bad)
### B) Bounding Box Detection
### C) Segmentation
### D) Anomaly Detection

---

## Karar: B) YOLOv8 Detection + A) Binary fallback

### Neden Detection (B) birincil seçim?

**Business argümanları:**
1. Bounding box → operatör "tam olarak NEREDE hata var" görebilir
2. Yatırımcı demo'sunda vizüel etki maksimum (kırmızı kutu görüntü üzerinde)
3. "AI sadece pass/fail demedi, lokasyon söyledi" → premium feature
4. Aynı model binary output da verebilir (confidence threshold üstü varsa = fail)

**Teknik argümanlar:**
1. YOLOv8n/s CPU'da bile 30-100ms inference → realtime kamera mümkün
2. NEU dataset zaten bbox annotation → training direkt başlar
3. MVTec mask → bbox dönüşümü trivial
4. Active learning loop için bbox label → daha bilgi yoğun feedback

**Neden Segmentation (C) değil (henüz)?**
- Training dataset gereksinimi 5-10x daha yüksek
- Annotation süresi 3-4x daha uzun
- MVP için overkill — sonuç aynı görünür
- YOLOv8-seg ile ilerisi için yol açık

**Neden Anomaly Detection (D) değil (henüz)?**
- MVTec ile harika çalışır ama "neyi" tespit ettiği açık değil
- Yatırımcıya "anomaly score: 0.73" vs "scratch detected: 0.91 confidence" → ikincisi daha güçlü anlatı
- Active learning için labeled data gerektirir
- Phase 2'de PatchCore / FastFlow olarak eklenecek

**Neden saf Binary Classification (A) değil?**
- "Fail" dedi ama nerede? → operatör tüm parçayı kontrol etmeli
- Lokasyon bilgisi → ROI crop → retraining kalitesi artar
- Binary classification detection'ın özel hali (bbox varsa fail = True)

### Implementation plan:
```
Phase 1 (MVP):  YOLOv8n detection  → binary output (defect var/yok)
Phase 2 (+3ay): YOLOv8s detection  → multi-class (scratch/dent/crack)
Phase 3 (+6ay): YOLOv8m + anomaly  → hybrid pipeline
Phase 4 (+1y):  Custom backbone + foundation model fine-tune
```

### Confidence threshold stratejisi:
```
confidence >= 0.75  → FAIL   (yüksek güven, hata var)
confidence 0.50-0.74 → REVIEW (insan onayı gerekli)
confidence < 0.50   → PASS   (veya ignore)
no detection        → PASS
```
Bu strateji:
- False negative riskini azaltır (kaliteli üretim için kritik)
- Belirsiz durumları operatöre iter → HITL pipeline tetiklenir
- Threshold parametrik → fabrikadan fabirka ayarlanabilir
