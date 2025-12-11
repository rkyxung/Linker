document.addEventListener("DOMContentLoaded", () => {

  const blocks = document.querySelectorAll(".input-with-icon");

  blocks.forEach((block) => {
    // 가짜 비밀번호 필드
    const visible = block.querySelector('[data-password="masked"]');
    // 진짜 비밀번호 필드
    const real = block.querySelector('[data-password="real"]');
    const toggle = block.querySelector(".password-toggle");

    // 필요한 요소가 하나라도 없으면 실행 중단
    if (!visible || !real || !toggle) return;


    let value = ""; 
    let show = false; 

    // 입력창 표시를 갱신하는 함수
    const updateDisplays = () => {
      real.value = value; // 숨겨진 입력창에는 실제 값 저장
      if (show) {
        visible.value = value; // 표시 모드일 땐 실제 글자 보여줌
      } else {
        visible.value = "*".repeat(value.length); // 숨김 모드일 땐 *로 대체
      }
      // React 등에서 입력 이벤트 감지하도록 input 이벤트 강제로 발생
      visible.dispatchEvent(new Event("input", { bubbles: true }));
    };


    visible.addEventListener("keydown", (e) => {

      if (e.key === "Enter") return;

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        value += e.key;
        e.preventDefault();
        updateDisplays(); 
        return;
      }


      if (e.key === "Backspace") {
        value = value.slice(0, -1); 
        e.preventDefault();
        updateDisplays();
        return;
      }

      // 방향키나 홈/엔드키 등은 커서 이동을 막기 위해 기본 동작 차단
      const navKeys = [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
        "Delete",
      ];
      if (navKeys.includes(e.key)) {
        e.preventDefault();
      }
    });

    // 붙여넣기 이벤트 처리
    visible.addEventListener("paste", (e) => {
      e.preventDefault(); // 기본 붙여넣기 동작 막기
      const text = (e.clipboardData || window.clipboardData).getData("text"); // 클립보드 텍스트 가져오기
      if (text) {
        value += text; // 복사된 텍스트 추가
        updateDisplays();
      }
    });

    // 토글 버튼 클릭 시 비밀번호 표시/숨김 전환
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      show = !show;
      toggle.classList.toggle("show", show);
      updateDisplays();
    });

    // 초기 화면 갱신 실행
    updateDisplays();
  });

  // 인증(로그인 등) 폼 유효성 검사
  const forms = document.querySelectorAll("form.form");

  forms.forEach((form) => {
    // 각 입력 그룹 선택 (data-field-group 속성으로 구분)
    const groups = form.querySelectorAll("[data-field-group]");

    groups.forEach((group) => {
      const input = group.querySelector(".input"); // 실제 입력창
      const label = group.querySelector(".label"); // 입력 라벨
      if (!input) return;

      // 입력값이 바뀔 때마다 오류가 있으면 제거
      input.addEventListener("input", () => {
        const trimmed = input.value.trim(); // 공백 제거
        if (trimmed !== "" && group.dataset.error) {
          delete group.dataset.error; // 그룹의 오류 제거
          if (label) {
            delete label.dataset.error; // 라벨의 오류도 제거
          }
        }
      });
    });

    // 폼 제출 시 유효성 검사 실행
    form.addEventListener("submit", (event) => {
      let firstInvalid = null; // 첫 번째로 비어 있는 입력창 저장

      groups.forEach((group) => {
        const input = group.querySelector(".input");
        const label = group.querySelector(".label");
        if (!input) return;

        const trimmed = input.value.trim(); // 입력값 공백 제거
        if (trimmed === "") {
          const msg = "필수 입력란을 작성해주세요."; // 오류 메시지
          group.dataset.error = msg; // 그룹에 오류 표시
          if (label) {
            label.dataset.error = msg; // 라벨에도 동일한 오류 표시
          }
          if (!firstInvalid) {
            firstInvalid = input; // 첫 번째 오류 입력창 기억
          }
        } else if (group.dataset.error) {
          delete group.dataset.error; // 오류 해제
          if (label) {
            delete label.dataset.error;
          }
        }
      });

      // 비어 있는 항목이 있으면 제출 막고 해당 입력창에 포커스
      if (firstInvalid) {
        event.preventDefault();
        firstInvalid.focus();
      }
    });
  });
});
