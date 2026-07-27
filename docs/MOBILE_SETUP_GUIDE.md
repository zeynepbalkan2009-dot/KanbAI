# Mobile Setup Guide

## Tablet HTTPS Pilot Mode

Browser camera access requires a secure origin. `localhost` works on the laptop, but a tablet opening `http://<laptop-ip>` will usually be blocked by the browser.

Use HTTPS pilot mode for tablet trials:

```powershell
.\scripts\start-pilot-https.ps1 -PrimeDemo
```

Then open the tablet URL:

```text
https://<laptop-ip>/dashboard/capture
```

The local certificate is self-signed. The tablet browser may show a warning on first open. For a real factory pilot, trust the generated certificate on the tablet or use a trusted certificate/tunnel.

## Device Activation

1. Open `Factory Devices` from the admin dashboard.
2. Create an activation token for the target station.
3. Open `https://<laptop-ip>/activate-device?token=...` on the tablet.
4. Confirm device name and location label.
5. After activation, open `Capture` on the same tablet.
6. The app should send periodic heartbeat updates.

## Photo Upload

`/api/v1/inspections` accepts multipart form upload. Recommended fields for pilot traceability:

- `device_id`
- `file`
- `product_id`
- `station_id`
- `serial_number`
- `lot_number`

## Offline Queue

If upload fails from the capture screen, the photo is stored in the browser's local offline queue. When the connection returns, or when the operator presses `Sync queue`, the queue is sent to the API again.
