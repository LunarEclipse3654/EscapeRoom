# Windows 실행 파일로 포장하기

현재는 HTML판과 Electron 패키징 틀을 제공합니다. `.exe` 빌드·실행 검증과 코드 서명은 아직 수행하지 않았습니다.

## 개발 환경

Windows x64에서 Node.js와 npm을 설치한 뒤 `last-signal` 폴더에서 아래 명령을 실행합니다. 의존성을 처음 내려받고 실행 파일을 빌드할 때 인터넷이 필요합니다. 완성된 게임의 실행에는 인터넷이 필요하지 않습니다.

```powershell
npm install
npm start
```

의존성은 Electron `44.7.2`, electron-builder `26.0.12`로 고정했습니다. 첫 설치로 생성되는 `package-lock.json`을 보관한 다음부터는 `npm ci`를 사용하면 같은 의존성을 설치할 수 있습니다. 이후 공개 배포 시점에는 Electron의 지원 상태와 보안 업데이트를 확인하고 버전을 갱신하세요.

버전 존재와 설정은 [Electron 공식 릴리스](https://releases.electronjs.org/release/v44.7.2), [electron-builder 릴리스](https://github.com/electron-userland/electron-builder/releases/tag/v26.0.12), [Windows 빌드 문서](https://www.electron.build/v26/docs/win/)를 기준으로 작성했습니다. 이 버전 조합의 실제 빌드 성공을 검증했다는 의미는 아닙니다.

## 빌드

```powershell
# 무설치판과 설치판 함께 생성
npm run dist:win

# 무설치판만 생성
npm run dist:portable

# 설치판만 생성
npm run dist:installer
```

결과는 `dist` 폴더에 생성됩니다. 무설치판은 설치 과정 없이 실행하는 `.exe`, NSIS는 설치 마법사가 있는 `.exe`입니다. 현재 대상은 Windows x64입니다. 정식 배포 전에는 앱 아이콘, 배포자 정보, 버전 정책과 코드 서명을 정하고 깨끗한 Windows 환경에서 검증하세요.

## 구조와 저장

`main.cjs`는 `../index.html`을 로컬 파일로 읽습니다. 게임은 브라우저 표준 API만 사용하고, 렌더러의 Node.js 접근은 꺼 두었습니다. 컨텍스트 격리와 샌드박스를 켰으며, 게임의 마우스 잠금과 전체 화면에 필요한 권한만 허용합니다. 새 창과 외부 페이지 이동도 막습니다. F11로 데스크톱 창의 전체 화면을 전환할 수 있습니다.

저장은 현재 브라우저의 로컬 저장소 어댑터를 사용합니다. Electron에서는 별도 앱 프로필에 저장되므로 기존 HTML판의 브라우저 저장과 자동으로 공유되지 않습니다. 이후 클라우드 저장이나 파일 저장이 필요하면 저장 어댑터를 교체하고, 제한된 preload/IPC 경로를 추가하는 방식으로 확장하세요. 게임 진행 규칙과 3D 공간 코드를 바꿀 필요는 없습니다.

배포에는 `index.html`, `style.css`, `js`, `vendor`와 데스크톱 시작 파일이 함께 포함됩니다. 게임 실행 중 원격 CDN에 의존하지 않습니다.

## 빌드 후 확인할 항목

- 인터넷이 끊긴 환경에서 시작 화면부터 탈출 완료까지 플레이
- 마우스 잠금, Esc, F11, 창 크기 변경과 장시간 포커스 이동
- 종료 후 이어하기, 새 게임, 사운드와 품질 설정
- 무설치판과 설치판 각각의 첫 실행 및 라이선스 고지 보존

HTML판만 플레이할 때는 이 폴더의 개발 작업이 필요하지 않습니다.
