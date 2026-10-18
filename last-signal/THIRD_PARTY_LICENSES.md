# 타사 구성요소

## Three.js r160 계열 / npm 0.160.1

게임에 로컬 사본으로 포함한 JavaScript 3D 렌더링 라이브러리입니다.

- 프로젝트: [Three.js](https://threejs.org/)
- 배포 패키지: [three 0.160.1](https://www.npmjs.com/package/three/v/0.160.1)
- 기반 릴리스 소스: [r160](https://github.com/mrdoob/three.js/tree/r160)
- 라이선스: MIT
- 원문 고지와 허가 조건: `vendor/THREE-LICENSE.txt`

Three.js를 포함해 게임을 재배포할 때 해당 라이선스 파일을 함께 보관하세요.

## 향후 데스크톱 빌드에 사용되는 개발 의존성

아래 패키지는 `package.json`에 버전이 고정되어 있습니다. 현재 HTML 배포물에는 Electron 실행 바이너리나 설치된 개발 패키지가 포함되지 않습니다.

- Electron 44.7.2 — [MIT](https://github.com/electron/electron/blob/v44.7.2/LICENSE)
- electron-builder 26.0.12 — [MIT](https://github.com/electron-userland/electron-builder/blob/v26.0.12/LICENSE)

Electron으로 실행 파일을 만들면 Chromium, Node.js 등 함께 배포되는 구성요소의 고지가 추가됩니다. 패키저가 생성하는 `LICENSE`, `LICENSES.chromium.html` 등의 고지 파일을 삭제하지 마세요. 실제 배포 전 설치된 의존성의 라이선스도 확인해 주세요.

이 게임은 원격 이미지, 음원, 폰트 서비스를 사용하지 않습니다.
