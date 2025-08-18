#!/bin/bash

# 폰트 디렉토리 생성
mkdir -p public/fonts

echo "📥 Downloading all fonts from Google Fonts..."

# Roboto 폰트
curl -L "https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Regular.ttf" -o public/fonts/Roboto-Regular.ttf
curl -L "https://github.com/google/fonts/raw/main/apache/roboto/static/Roboto-Bold.ttf" -o public/fonts/Roboto-Bold.ttf

# Open Sans 폰트
curl -L "https://github.com/google/fonts/raw/main/ofl/opensans/static/OpenSans-Regular.ttf" -o public/fonts/OpenSans-Regular.ttf
curl -L "https://github.com/google/fonts/raw/main/ofl/opensans/static/OpenSans-Bold.ttf" -o public/fonts/OpenSans-Bold.ttf

# Montserrat 폰트
curl -L "https://github.com/google/fonts/raw/main/ofl/montserrat/static/Montserrat-Regular.ttf" -o public/fonts/Montserrat-Regular.ttf
curl -L "https://github.com/google/fonts/raw/main/ofl/montserrat/static/Montserrat-Bold.ttf" -o public/fonts/Montserrat-Bold.ttf

# Poppins 폰트
curl -L "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Regular.ttf" -o public/fonts/Poppins-Regular.ttf
curl -L "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf" -o public/fonts/Poppins-Bold.ttf

# Playfair Display 폰트
curl -L "https://github.com/google/fonts/raw/main/ofl/playfairdisplay/static/PlayfairDisplay-Regular.ttf" -o public/fonts/PlayfairDisplay-Regular.ttf
curl -L "https://github.com/google/fonts/raw/main/ofl/playfairdisplay/static/PlayfairDisplay-Bold.ttf" -o public/fonts/PlayfairDisplay-Bold.ttf

# Merriweather 폰트
curl -L "https://github.com/google/fonts/raw/main/ofl/merriweather/Merriweather-Regular.ttf" -o public/fonts/Merriweather-Regular.ttf
curl -L "https://github.com/google/fonts/raw/main/ofl/merriweather/Merriweather-Bold.ttf" -o public/fonts/Merriweather-Bold.ttf

# Dancing Script 폰트
curl -L "https://github.com/google/fonts/raw/main/ofl/dancingscript/static/DancingScript-Regular.ttf" -o public/fonts/DancingScript-Regular.ttf
curl -L "https://github.com/google/fonts/raw/main/ofl/dancingscript/static/DancingScript-Bold.ttf" -o public/fonts/DancingScript-Bold.ttf

# Pacifico 폰트
curl -L "https://github.com/google/fonts/raw/main/ofl/pacifico/Pacifico-Regular.ttf" -o public/fonts/Pacifico-Regular.ttf

# Lobster 폰트
curl -L "https://github.com/google/fonts/raw/main/ofl/lobster/Lobster-Regular.ttf" -o public/fonts/Lobster-Regular.ttf

# Bebas Neue 폰트
curl -L "https://github.com/google/fonts/raw/main/ofl/bebasneue/BebasNeue-Regular.ttf" -o public/fonts/BebasNeue-Regular.ttf

# Oswald 폰트
curl -L "https://github.com/google/fonts/raw/main/ofl/oswald/static/Oswald-Regular.ttf" -o public/fonts/Oswald-Regular.ttf
curl -L "https://github.com/google/fonts/raw/main/ofl/oswald/static/Oswald-Bold.ttf" -o public/fonts/Oswald-Bold.ttf

# Noto Sans KR 폰트 (파일 크기가 크므로 선택적)
echo "📥 Downloading Korean fonts (this may take longer)..."
curl -L "https://github.com/google/fonts/raw/main/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf" -o public/fonts/NotoSansKR-Regular.ttf

echo "✅ All fonts downloaded successfully!"
echo "📁 Font files are in public/fonts/"
echo ""
echo "📊 Downloaded fonts summary:"
ls -lh public/fonts/ | tail -n +2 | wc -l | xargs -I {} echo "Total fonts: {} files"
du -sh public/fonts/ | awk '{print "Total size: " $1}'