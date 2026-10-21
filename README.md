# Smart Farm — Frontend

Web dashboard Next.js untuk Smart Farm: login, kelola pengguna (admin), daftar perangkat, grafik sensor, kontrol relay.

- Backend: https://github.com/nizamajem/smart-farm-backend
- Mobile: https://github.com/nizamajem/smart-farm-mobile

## Menjalankan

```bash
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3001/api
npm run dev                        # http://localhost:3000
```

Backend harus berjalan terlebih dahulu.

## Produksi

`Dockerfile` membangun output standalone Next.js dan menjalankannya dengan PM2.
`NEXT_PUBLIC_API_URL` ditanam saat build (default `/api`, backend di domain yang sama lewat reverse proxy).
Deploy lengkap: lihat [smart-farm-deploy](https://github.com/nizamajem/smart-farm-deploy).
