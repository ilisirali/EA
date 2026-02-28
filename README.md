# EA APP - Personel Takip Sistemi

Bu uygulama, personel çalışma saatlerini, konumlarını ve günlük aktivitelerini takip etmek için geliştirilmiştir.

## Özellikler

- **Çoklu Dil Desteği:** Türkçe, Hollandaca, İngilizce ve Arapça.
- **Dijital Kayıt:** Kağıt kalemle uğraşmadan tüm işleri dijital ortamda kaydedin.
- **PDF Raporlama:** Haftalık çalışma raporlarını tek tıkla oluşturun ve paylaşın.
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Database, Auth, Edge Functions)
- **Mobile**: Capacitor (Android/iOS)

## Development Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Create a `.env` file based on the environment variables required (Supabase URL and Anon Key).

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Build for Production**:
   ```bash
   npm run build
   ```

## Mobile Development

The project uses Capacitor to bridge the web app to mobile platforms.

- **Add Platform**: `npx cap add android` or `npx cap add ios`
- **Sync Code**: `npx cap sync`
- **Open IDE**: `npx cap open android` or `npx cap open ios`

