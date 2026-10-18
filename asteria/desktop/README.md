# Windows 실행 파일 만들기

이 폴더의 `main.cjs`는 같은 게임 `index.html`을 데스크톱 창에 불러옵니다. 게임 규칙이나 단서를 다시 구현할 필요가 없습니다. 별도의 웹 서버 없이 실행하며, 게임 페이지에서 Node.js에 접근하지 못하도록 분리했습니다.

Node.js와 npm이 설치된 환경에서 `asteria` 폴더를 열고 실행합니다.

```text
npm install
npm run desktop
npm run dist:portable
```

`dist`에 설치 없이 실행하는 Windows x64 파일이 생성됩니다. 설치형은 `npm run dist:installer`로 만듭니다. `npm run dist:win`은 두 형식을 함께 만듭니다. 의존성 설치와 Electron 배포 파일 다운로드에는 인터넷이 필요하지만, 만들어진 게임은 오프라인으로 실행합니다.

HTML 내용이 바뀌어도 실행부는 같은 파일을 읽습니다. 독립된 저장 프로필 `persist:asteria`를 사용합니다. F11로 전체 화면을 전환합니다. 외부 창·페이지 탐색·다운로드는 막고 게임에 필요한 마우스 잠금과 전체 화면만 허용합니다.

이번 제작에서는 HTML 브라우저판을 검증했습니다. 실제 `.exe` 빌드·설치·실행 및 코드 서명은 수행하지 않았습니다. 배포 전 대상 Windows에서 확인하세요.
