# Mobile Setup Guide

## Phone/Tablet Pilot Mode

The laptop dashboard is for the quality owner. The phone/tablet screen is only for operator photo capture.

Start the local factory pilot:

```powershell
.\scripts\start-factory-pilot.ps1 -Build
```

Then open this URL on the phone/tablet while it is on the same Wi-Fi:

```text
http://<laptop-ip>/operator/capture
```

Use the plain `http://` operator URL for the local pilot unless a trusted certificate has been installed on the phone. This avoids self-signed certificate warnings during the first factory visit.

## Device Activation

1. Open `Factory Devices` from the admin dashboard.
2. Create an activation token for the target station.
3. Open `http://<laptop-ip>/activate-device?token=...` on the tablet.
4. Confirm device name and location label.
5. After activation, open `http://<laptop-ip>/operator/capture` on the same tablet.
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
