# Sand Vac

**[English](#english) · [Türkçe](#türkçe)**

A casual mobile puzzle game: a picture made of sand grains sits on top, and colourful vacuum cleaners clean it up. You earn those vacuums by solving a different puzzle at the bottom of every level.

Prototype · HTML5 canvas · Android APK via Capacitor · No dependencies at runtime

---

## English

### How to play

1. **The picture** at the top is made of thousands of sand grains, and they really fall. Remove sand from below and the grains above slide down.
2. **Solve the puzzle** at the bottom to earn vacuum cleaners. A vacuum's colour is the sand colour it collects, and its number is how many grains it can hold.
3. Each new vacuum **rides the rail** once around the picture and sucks up every grain of its colour it can see. Its see-through bin fills up as it goes.
4. A vacuum that finishes its lap without filling up waits in the **5-slot dock**. Tap it to send it around again. If the dock is full when another vacuum comes back, you lose.
5. The level is complete when the picture is **spotless**.

### Levels

| # | Picture | Bottom puzzle | Rule |
|---|---------|---------------|------|
| 1 | Heart | Number Merge | Merge two vacuums of the same colour and number. Every send uses up one move. |
| 2 | Sailboat | Color Sort | Pour sand between tubes. When a tube holds 4 layers of one colour, it becomes a vacuum. |
| 3 | Daisy | Match-3 | Matches fill that colour's charge bar. A full bar releases a vacuum. |
| 4 | Snowy Peak | Push Puzzle | Push vacuum crates out through the purple gates. Undo is available. |
| 5 | Cat | Arrow Escape | A vacuum slides out only if the path in its arrow's direction is clear. |
| 6 | Sunset | Pipe Connect | Rotate pipes to lead the sand to the empty vacuum. |

The game is in Turkish and English. Use the **EN / TR** button in the top bar to switch. The first language follows your device's language.

### Install

Download `SandVac-*.apk` from [Releases](../../releases) and open it on an Android phone (Android 6+). Android will ask you once to allow installs from unknown sources.

### Run locally

```bash
npm test                                   # 20 logic tests (node --test)
python -m http.server 8130 --directory www  # then open http://localhost:8130
```

### Build the APK

Requires JDK 21 and the Android SDK.

```bash
npm install
npx cap copy android
cd android && ./gradlew assembleDebug      # app/build/outputs/apk/debug/app-debug.apk
```

> On Windows, if Gradle fails with `Unable to establish loopback connection`, your temp path contains a space. Point `TMP`, `TEMP` and `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=<dir>` at a folder without spaces.

### Project layout

```
www/js/core/      sand simulation, pictures, palette, seeded RNG
www/js/puzzles/   the six bottom puzzles (pure logic + drawing)
www/js/game.js    rail, vacuums, dock, win / lose
www/js/i18n.js    Turkish and English strings
tests/            node:test suites, including a bot that clears every level
android/          Capacitor Android project
```

---

## Türkçe

### Nasıl oynanır

1. Üstteki **resim** binlerce kum tanesinden oluşur ve taneler gerçekten akar. Alttan kum alınca üstteki taneler aşağı kayar.
2. Alttaki **bulmacayı çöz** ve elektrik süpürgeleri kazan. Süpürgenin rengi topladığı kumun rengidir, üstündeki sayı da kaç tane alabileceğidir.
3. Her yeni süpürge resmin etrafındaki **rayda** bir tur atar ve gördüğü kendi rengindeki tüm taneleri emer. Şeffaf haznesi yol boyunca dolar.
4. Turunu dolmadan bitiren süpürge **5 yerlik iskelede** bekler. Ona dokununca yeniden tura çıkar. Başka bir süpürge döndüğünde iskele doluysa kaybedersin.
5. Resim **tertemiz** olunca bölüm biter.

### Bölümler

| # | Resim | Alt bulmaca | Kural |
|---|-------|-------------|-------|
| 1 | Kalp | Sayı Birleştirme | Aynı renk ve aynı sayıdaki iki süpürgeyi birleştir. Her gönderim bir hak harcar. |
| 2 | Yelkenli | Renk Sıralama | Kumu tüpten tüpe dök. 4 katmanı aynı renk olan tüp süpürgeye dönüşür. |
| 3 | Papatya | Üçlü Eşleştirme | Eşleştirmeler o rengin göstergesini doldurur. Dolan gösterge bir süpürge çıkarır. |
| 4 | Karlı Dağ | İtme Bulmacası | Süpürge kutularını mor kapılardan dışarı it. Geri alma tuşu var. |
| 5 | Kedi | Ok Kaçışı | Süpürge, okunun gösterdiği yol boşsa kayıp çıkar. |
| 6 | Gün Batımı | Boru Bağlama | Boruları döndürerek kumu boş süpürgeye ulaştır. |

Oyun Türkçe ve İngilizce. Dili üst çubuktaki **EN / TR** düğmesiyle değiştirebilirsin. İlk açılışta cihazının dili seçilir.

### Kurulum

[Releases](../../releases) sayfasından `SandVac-*.apk` dosyasını indirip Android telefonunda aç (Android 6 ve üzeri). Android bir kez bilinmeyen kaynaklardan yükleme izni ister.

### Yerelde çalıştırma ve APK derleme

Komutlar İngilizce bölümdekilerle aynı: testler için `npm test`, tarayıcıda oynamak için `www` klasörünü yerel bir sunucuyla aç. APK için `npx cap copy android`, ardından `android` klasöründe `gradlew assembleDebug` çalıştır. JDK 21 ve Android SDK gerekir.

---

Prototype built with [Claude Code](https://claude.com/claude-code).
