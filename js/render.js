(function () {
  const esc = App.util.esc;
  const P = App.const.P;
  // Shared frame height for every non-home page's main content area, matching how
  // tall the home dashboard's grid (목표 달성 현황 + 주간 일정 + 월간 일정 stacked)
  // typically renders, so switching between menu tabs doesn't jump around in size.
  const MAIN_HEIGHT = 1096;

  function renderHeader(vm) {
    const nav = vm.navItems.map(n =>
      `<button data-action="setView" data-value="${n.view}" style="${App.logic.navStyle(n.active)}">${esc(n.label)}</button>`
    ).join('');
    return `
    <div style="background:#fff;border-bottom:1px solid #E3E5E8">
      <div style="height:56px;display:flex;align-items:center;padding:0 28px;gap:34px">
        <div style="display:flex;align-items:center;gap:11px">
          <div style="width:30px;height:30px;background:#F37321;border-radius:7px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:17px">W</div>
          <span style="font-weight:900;font-size:17px;letter-spacing:-.3px">WorkFlow<span style="color:#F37321"> Portal</span></span>
        </div>
        <nav style="display:flex;align-items:center;gap:2px;height:100%">${nav}</nav>
        <div style="margin-left:auto;display:flex;align-items:center;gap:16px">
          <div style="text-align:right;line-height:1.25">
            <div style="font-size:12px;color:#888">${esc(vm.todayLabel)}</div>
            <div style="font-size:12px;font-weight:700">담당자 · 김실무</div>
          </div>
          <div style="width:34px;height:34px;border-radius:50%;background:#F5F6F7;border:1px solid #E3E5E8;display:flex;align-items:center;justify-content:center;font-weight:700;color:#888;font-size:13px">김</div>
        </div>
      </div>
    </div>`;
  }

  function renderAlerts(vm) {
    const items = vm.alerts.map(a => `<span>· ${esc(a)}</span>`).join('');
    return `
    <div style="background:#FFF4EC;border-bottom:1px solid #FADFC9;padding:9px 28px;display:flex;align-items:center;gap:12px;font-size:13px">
      <span style="background:#F37321;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px">알림</span>
      <div style="display:flex;gap:22px;flex-wrap:wrap;color:#7a4a24">${items}</div>
    </div>`;
  }

  function taskChip(t) {
    return `<div data-action="openEdit" data-id="${t.id}" title="${esc(t.name)}" style="${t.style}">${esc(t.name)}</div>`;
  }

  // Recurring is no longer its own 유형 — it's an independent flag (t.recur holds
  // the cycle string when on) layered onto whichever real type the task has, so it
  // gets its own small indicator wherever the type badge is shown.
  function recurBadge(t) {
    return t.recur ? `<span style="background:#EEF2FA;color:#3f6fb5;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;flex:none">반복</span>` : '';
  }

  function renderWeekly(vm) {
    const cols = 'repeat(7,minmax(0,1fr))';
    const heads = vm.weekDays.map(d => `
      <div data-action="openNewOnDate" data-date="${d.dateIso}" style="${d.colStyle};${d.headStyle}">
        <span style="${d.dowStyle}">${d.dow}</span>
        <span style="${d.dateStyle}">${d.date}</span>
      </div>`).join('');
    const laneRowH = 22;
    const laneBg = vm.weekDays.map((d, i) => `<div data-action="openNewOnDate" data-date="${d.dateIso}" style="grid-column:${i + 1};grid-row:1 / ${vm.weekLaneCount + 1};${d.colStyle}"></div>`).join('');
    const bars = vm.weekBars.map(b => `<div data-action="openEdit" data-id="${b.id}" title="${esc(b.label)}" style="${b.style}">${esc(b.label)}</div>`).join('');
    const items = vm.weekDays.map(d => `
      <div data-action="openNewOnDate" data-date="${d.dateIso}" style="${d.colStyle};border-bottom:1px solid #EEF0F2">
        <div style="padding:7px 6px;display:flex;flex-direction:column;gap:4px;height:96px;overflow:hidden">
          ${d.items.map(taskChip).join('')}
        </div>
      </div>`).join('');
    return `
    <div style="background:#fff;border:1px solid #E3E5E8;border-radius:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #EEF0F2">
        <div style="display:flex;align-items:baseline;gap:10px">
          <span style="font-size:15.5px;font-weight:700">주간 일정</span>
          <span style="font-size:12px;color:#888">${esc(vm.weekRangeLabel)}</span>
        </div>
        <div style="display:flex;gap:6px">
          <button data-action="prevWeek" style="width:26px;height:26px;border:1px solid #E3E5E8;background:#fff;border-radius:6px;cursor:pointer;color:#888">‹</button>
          <button data-action="thisWeek" style="height:26px;padding:0 10px;border:1px solid #E3E5E8;background:#fff;border-radius:6px;cursor:pointer;color:#555;font-size:11.5px">오늘</button>
          <button data-action="nextWeek" style="width:26px;height:26px;border:1px solid #E3E5E8;background:#fff;border-radius:6px;cursor:pointer;color:#888">›</button>
        </div>
      </div>
      <div style="padding:0 8px 10px">
        <div style="display:grid;grid-template-columns:${cols}">${heads}</div>
        <div style="display:grid;grid-template-columns:${cols}">${items}</div>
        <div style="display:grid;grid-template-columns:${cols};grid-auto-rows:${laneRowH}px;position:relative">${laneBg}${bars}</div>
      </div>
    </div>`;
  }

  function renderMonthly(vm) {
    const heads = vm.dowHeaders.map(h => `<div style="${h.style}">${h.label}</div>`).join('');
    const cells = vm.monthCells.map(c => `
      <div data-action="openNewOnDate" data-date="${c.dateIso}" style="${c.cellStyle}">
        <span style="${c.numStyle}">${c.day}</span>
        <div style="display:flex;flex-direction:column;gap:2px;margin-top:2px">
          ${c.items.map(taskChip).join('')}
          ${c.moreShow ? `<div style="font-size:10px;color:#aaa;padding-left:2px">+${c.more}</div>` : ''}
        </div>
      </div>`).join('');
    return `
    <div style="background:#fff;border:1px solid #E3E5E8;border-radius:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #EEF0F2">
        <div style="display:flex;align-items:baseline;gap:10px">
          <span style="font-size:15.5px;font-weight:700">월간 일정</span>
          <span style="font-size:12px;color:#888">${esc(vm.monthLabel)}</span>
        </div>
        <div style="display:flex;gap:6px">
          <button data-action="prevMonth" style="width:26px;height:26px;border:1px solid #E3E5E8;background:#fff;border-radius:6px;cursor:pointer;color:#888">‹</button>
          <button data-action="thisMonth" style="height:26px;padding:0 10px;border:1px solid #E3E5E8;background:#fff;border-radius:6px;cursor:pointer;color:#555;font-size:11.5px">이번 달</button>
          <button data-action="nextMonth" style="width:26px;height:26px;border:1px solid #E3E5E8;background:#fff;border-radius:6px;cursor:pointer;color:#888">›</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 18px;border-bottom:1px solid #EEF0F2;background:#FAFBFC">
        <span style="font-size:11.5px;color:#888">${vm.googleConnected ? (vm.googleLastSyncLabel ? `마지막 동기화 ${vm.googleLastSyncLabel}` : '연동됨 · 아직 동기화 전') : 'Google 캘린더와 연동하면 이 달력 내용을 내보낼 수 있어요'}</span>
        <div style="display:flex;gap:6px">
          <button data-action="syncGoogle" ${vm.googleSyncing ? 'disabled' : ''} style="height:26px;padding:0 12px;border:1px solid ${P};background:${vm.googleSyncing ? '#f5f5f5' : '#fff'};color:${P};border-radius:6px;cursor:${vm.googleSyncing ? 'default' : 'pointer'};font-size:11.5px;font-weight:700">${vm.googleSyncing ? '동기화 중…' : (vm.googleConnected ? '지금 동기화' : 'Google 캘린더 연동')}</button>
          ${vm.googleConnected ? `<button data-action="disconnectGoogle" style="height:26px;padding:0 10px;border:1px solid #E3E5E8;background:#fff;color:#888;border-radius:6px;cursor:pointer;font-size:11.5px">연동 해제</button>` : ''}
        </div>
      </div>
      <div style="padding:12px 14px 16px">
        <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));margin-bottom:4px">${heads}</div>
        <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));grid-auto-rows:70px;border-top:1px solid #EEF0F2;border-left:1px solid #EEF0F2">${cells}</div>
      </div>
    </div>`;
  }

  function renderTop5(vm, stretch) {
    const cardExtra = stretch ? ';flex:1;display:flex;flex-direction:column;min-height:0' : '';
    const listExtra = stretch ? 'flex:1;overflow:auto' : '';
    const rows = vm.top5.map(t => `
      <div data-action="openEdit" data-id="${t.id}" style="${t.rowStyle}">
        <div style="${t.rankStyle}">${t.rank}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</div>
          <div style="display:flex;align-items:center;gap:7px;margin-top:3px">
            <span style="${t.typeBadgeStyle}">${t.typeLabel}</span>${recurBadge(t)}
            <span style="font-size:11.5px;color:#888">중요 ${t.impLabel} · 긴급 ${t.urgLabel}</span>
            <span style="${t.ddayStyle}">${t.ddayLabel}</span>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:19px;font-weight:900;color:#F37321;line-height:1">${t.score}</div>
          <div style="font-size:10px;color:#aaa;margin-top:2px">점</div>
        </div>
      </div>`).join('');
    return `
    <div style="background:#fff;border:1px solid #E3E5E8;border-radius:8px${cardExtra}">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #EEF0F2">
        <span style="font-size:15.5px;font-weight:700">우선순위 Top 5</span>
        <span style="font-size:11.5px;color:#aaa">중요도×2 + 긴급도 + 마감가중</span>
      </div>
      <div style="${listExtra}">${rows}</div>
    </div>`;
  }

  function renderPersonal(vm, stretch) {
    const cardExtra = stretch ? ';flex:1;display:flex;flex-direction:column;min-height:0' : '';
    const listExtra = stretch ? 'flex:1;overflow:auto' : '';
    const cards = vm.personalCards.map(t => `
      <div data-action="openEdit" data-id="${t.id}" style="border:1px solid #EEF0F2;border-radius:7px;padding:8px 13px;cursor:pointer">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="${t.typeBadgeStyle}">${t.typeLabel}</span>${recurBadge(t)}
          <span style="font-size:13.5px;font-weight:700;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</span>
          ${t.stalled ? `<span style="background:#FBECEC;color:#E53935;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:4px">정체</span>` : ''}
          <span style="${t.ddayStyle}">${t.ddayLabel}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
          <div style="flex:1;height:7px;background:#EEF0F2;border-radius:4px;overflow:hidden">
            <div style="height:100%;border-radius:4px;background:${t.barColor};width: ${t.progress}%"></div>
          </div>
          <span style="font-size:12.5px;font-weight:900;color:#333;width:34px;text-align:right">${t.progress}%</span>
        </div>
      </div>`).join('');
    return `
    <div style="background:#fff;border:1px solid #E3E5E8;border-radius:8px${cardExtra}">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #EEF0F2">
        <div style="display:flex;align-items:baseline;gap:9px">
          <span style="font-size:15.5px;font-weight:700">개인 일정</span>
          <span style="font-size:12px;color:#888">${vm.personalCards.length}건</span>
        </div>
        <button data-action="setView" data-value="tasks" style="border:none;background:none;color:#888;font-size:12px;cursor:pointer">더보기 ›</button>
      </div>
      <div style="padding:10px 16px;display:flex;flex-direction:column;gap:6px;${listExtra}">
        ${cards || `<div style="font-size:12px;color:#bbb;padding:16px 4px;text-align:center">등록된 개인 일정이 없습니다</div>`}
      </div>
    </div>`;
  }

  function renderGoalGauges(vm) {
    const cells = vm.goalGauges.map(g => `
      <div style="background:#fff;padding:16px 14px;display:flex;flex-direction:column;align-items:center">
        <div style="position:relative;width:104px;height:104px">
          <svg width="104" height="104" viewBox="0 0 104 104" style="transform:rotate(-90deg)">
            <circle cx="52" cy="52" r="44" fill="none" stroke="#EEF0F2" stroke-width="11"></circle>
            <circle cx="52" cy="52" r="44" fill="none" stroke="${g.color}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${g.dash}"></circle>
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
            <span style="font-size:22px;font-weight:900;color:#F37321;line-height:1">${g.pct}</span>
            <span style="font-size:10px;color:#aaa">%</span>
          </div>
        </div>
        <div style="font-size:12.5px;font-weight:700;margin-top:9px;text-align:center;line-height:1.3">${esc(g.name)}</div>
        <div style="${g.tagStyle}">${g.tag}</div>
      </div>`).join('');
    return `
    <div style="background:#fff;border:1px solid #E3E5E8;border-radius:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #EEF0F2">
        <span style="font-size:15.5px;font-weight:700">목표 달성 현황</span>
        <button data-action="setView" data-value="goals" style="border:none;background:none;color:#888;font-size:12px;cursor:pointer">더보기 ›</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:2px;background:#EEF0F2">${cells}</div>
    </div>`;
  }

  function renderOngoing(vm) {
    const cards = vm.ongoingCards.map(t => `
      <div data-action="openEdit" data-id="${t.id}" style="border:1px solid #EEF0F2;border-radius:7px;padding:8px 13px;cursor:pointer">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="${t.prioBadge}">${t.prioLabel}</span>
          <span style="font-size:13.5px;font-weight:700;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</span>
          ${t.stalled ? `<span style="background:#FBECEC;color:#E53935;font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:4px">정체</span>` : ''}
          <span style="${t.ddayStyle}">${t.ddayLabel}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
          <div style="flex:1;height:7px;background:#EEF0F2;border-radius:4px;overflow:hidden">
            <div style="height:100%;border-radius:4px;background:${t.barColor};width: ${t.progress}%"></div>
          </div>
          <span style="font-size:12.5px;font-weight:900;color:#333;width:34px;text-align:right">${t.progress}%</span>
        </div>
      </div>`).join('');
    return `
    <div style="background:#fff;border:1px solid #E3E5E8;border-radius:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #EEF0F2">
        <div style="display:flex;align-items:baseline;gap:9px">
          <span style="font-size:15.5px;font-weight:700">지속 업무 진행률</span>
          <span style="font-size:12px;color:#888">진행 중 ${vm.ongoingCount}건</span>
        </div>
        <button data-action="setView" data-value="tasks" style="border:none;background:none;color:#888;font-size:12px;cursor:pointer">더보기 ›</button>
      </div>
      <div style="padding:10px 16px;display:flex;flex-direction:column;gap:6px;max-height:290px;overflow:auto">${cards}</div>
    </div>`;
  }

  function renderHome(vm) {
    return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div>
        <h1 style="margin:0;font-size:20px;font-weight:900;letter-spacing:-.4px">대시보드</h1>
        <div style="font-size:12.5px;color:#888;margin-top:3px">반복 일정 · 지속 업무 · 연간 목표를 한 화면에서</div>
      </div>
      <button data-action="openNew" style="background:#F37321;color:#fff;border:none;font-weight:700;font-size:13px;padding:9px 18px;border-radius:20px;cursor:pointer;box-shadow:0 1px 3px rgba(243,115,33,.35)">+ 새 업무 등록</button>
    </div>
    <div style="display:grid;grid-template-columns:1.35fr 1fr;gap:16px">
      <div style="display:flex;flex-direction:column;gap:16px">
        ${renderGoalGauges(vm)}
        ${renderWeekly(vm)}
        ${renderMonthly(vm)}
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        ${renderOngoing(vm)}
        ${renderTop5(vm)}
        ${renderPersonal(vm, true)}
      </div>
    </div>`;
  }

  function renderTasks(vm) {
    const typeFilters = vm.typeFilters.map(f => `<button data-action="setFilterType" data-value="${f.value}" style="${App.logic.chip(f.active)}">${f.label}</button>`).join('');
    const statusFilters = vm.statusFilters.map(f => `<button data-action="setFilterStatus" data-value="${f.value}" style="${App.logic.chip(f.active)}">${f.label}</button>`).join('');
    const groups = vm.tableGroups.map(grp => `
      <div>
        <div style="${grp.headStyle}">
          <span style="${grp.dotStyle}"></span>
          <span style="font-size:12.5px;font-weight:700;color:#444">${esc(grp.name)}</span>
          <span style="font-size:11px;color:#888">${grp.count}건</span>
          ${grp.isGoal ? `<span style="margin-left:auto;font-size:11px;color:#888">평균 진행률 <b style="color:#F37321">${grp.avg}%</b></span>` : ''}
        </div>
        ${grp.rows.map(t => `
          <div style="display:grid;grid-template-columns:2.4fr .9fr .9fr .9fr .7fr .7fr .7fr 1.6fr 1.3fr;border-bottom:1px solid #F2F3F5;align-items:center;font-size:12.5px">
            <div style="padding:11px 14px;display:flex;align-items:center;gap:8px;min-width:0">
              <span data-action="openEdit" data-id="${t.id}" style="font-weight:500;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</span>
              ${t.stalled ? `<span style="background:#FBECEC;color:#E53935;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;flex:none">정체</span>` : ''}
              ${recurBadge(t)}
            </div>
            <div style="padding:11px 8px"><span style="${t.typeBadgeStyle}">${t.typeLabel}</span></div>
            <div style="padding:11px 8px;color:#888">${t.startLabel}</div>
            <div style="padding:11px 8px;color:#666">${t.dueLabel}</div>
            <div style="padding:11px 8px;text-align:center;color:#666">${t.impLabel}</div>
            <div style="padding:11px 8px;text-align:center;color:#666">${t.urgLabel}</div>
            <div style="padding:11px 8px;text-align:center;font-weight:900;color:#F37321">${t.score}</div>
            <div style="padding:11px 8px;display:flex;align-items:center;gap:8px">
              <input type="range" min="0" max="100" step="5" value="${t.progress}" data-action="setRowProgress" data-id="${t.id}" id="row-progress-${t.id}" style="flex:1;accent-color:#F37321;cursor:pointer">
              <span style="font-size:11.5px;font-weight:700;width:32px;text-align:right">${t.progress}%</span>
            </div>
            <div style="padding:11px 8px">
              <select data-action="setRowStatus" data-id="${t.id}" id="row-status-${t.id}" style="${t.statusSelStyle}">
                <option value="예정" ${t.rawStatus === '예정' ? 'selected' : ''}>예정</option>
                <option value="진행중" ${t.rawStatus === '진행중' ? 'selected' : ''}>진행중</option>
                <option value="완료" ${t.rawStatus === '완료' ? 'selected' : ''}>완료</option>
              </select>
              ${t.overdue ? `<span style="display:inline-block;margin-left:5px;background:#FBECEC;color:#E53935;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px">지연</span>` : ''}
            </div>
          </div>`).join('')}
      </div>`).join('');
    return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div>
        <h1 style="margin:0;font-size:20px;font-weight:900;letter-spacing:-.4px">업무 목록 / 관리</h1>
        <div style="font-size:12.5px;color:#888;margin-top:3px">전체 ${vm.allCount}건 · 표시 ${vm.viewCount}건</div>
      </div>
      <button data-action="openNew" style="background:#F37321;color:#fff;border:none;font-weight:700;font-size:13px;padding:9px 18px;border-radius:20px;cursor:pointer;box-shadow:0 1px 3px rgba(243,115,33,.35)">+ 새 업무 등록</button>
    </div>
    <div style="background:#fff;border:1px solid #E3E5E8;border-radius:8px;overflow:hidden;height:${MAIN_HEIGHT}px;display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;gap:16px;padding:12px 18px;border-bottom:1px solid #EEF0F2;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:7px">
          <span style="font-size:12px;color:#888;font-weight:700">유형</span>${typeFilters}
        </div>
        <div style="display:flex;align-items:center;gap:7px">
          <span style="font-size:12px;color:#888;font-weight:700">상태</span>${statusFilters}
        </div>
        <div style="margin-left:auto;display:flex;align-items:center;gap:7px">
          <span style="font-size:12px;color:#888;font-weight:700">정렬</span>
          <select data-action="setSort" id="sort-by" style="height:30px;border:1px solid #E3E5E8;border-radius:6px;padding:0 8px;font-size:12.5px;color:#555;background:#fff">
            <option value="score" ${vm.sortBy === 'score' ? 'selected' : ''}>우선순위 높은순</option>
            <option value="due" ${vm.sortBy === 'due' ? 'selected' : ''}>마감 임박순</option>
            <option value="progress" ${vm.sortBy === 'progress' ? 'selected' : ''}>진행률 낮은순</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:2.4fr .9fr .9fr .9fr .7fr .7fr .7fr 1.6fr 1.3fr;background:#F5F6F7;border-bottom:1px solid #E3E5E8;font-size:11.5px;font-weight:700;color:#888">
        <div style="padding:10px 14px">업무명</div>
        <div style="padding:10px 8px">유형</div>
        <div style="padding:10px 8px">시작일</div>
        <div style="padding:10px 8px">마감일</div>
        <div style="padding:10px 8px;text-align:center">중요</div>
        <div style="padding:10px 8px;text-align:center">긴급</div>
        <div style="padding:10px 8px;text-align:center">점수</div>
        <div style="padding:10px 8px">진행률</div>
        <div style="padding:10px 8px">상태</div>
      </div>
      <div style="flex:1;overflow:auto">${groups}</div>
    </div>`;
  }

  function renderMatrix(vm) {
    // Explicit grid-column/grid-row placement (rather than relying on document-order
    // auto-flow) so the 2x2 quadrants always land under the right axis labels.
    const QUAD_POS = ['grid-column:2;grid-row:2', 'grid-column:3;grid-row:2', 'grid-column:2;grid-row:3', 'grid-column:3;grid-row:3'];
    const boxes = vm.quadrants.map((q, i) => `
      <div style="${QUAD_POS[i]};${q.boxStyle}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:8px"><span style="${q.dotStyle}"></span><span style="font-size:14px;font-weight:900">${q.title}</span></div>
          <span style="font-size:11.5px;color:#888;font-weight:700">${q.action}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;overflow:auto;flex:1">
          ${q.items.map(t => `
            <div data-action="openEdit" data-id="${t.id}" style="background:#fff;border:1px solid #EEF0F2;border-radius:6px;padding:8px 11px;cursor:pointer;display:flex;align-items:center;gap:8px">
              <span style="${t.typeBadgeStyle}">${t.typeLabel}</span>${recurBadge(t)}
              <span style="font-size:12.5px;font-weight:500;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</span>
              <span style="${t.ddayStyle}">${t.ddayLabel}</span>
              <span style="font-size:12px;font-weight:900;color:#F37321">${t.score}점</span>
            </div>`).join('')}
          ${q.empty ? `<div style="font-size:12px;color:#bbb;padding:8px 4px">해당 업무 없음</div>` : ''}
        </div>
      </div>`).join('');
    return `
    <div style="margin-bottom:16px">
      <h1 style="margin:0;font-size:20px;font-weight:900;letter-spacing:-.4px">아이젠하워 매트릭스</h1>
      <div style="font-size:12.5px;color:#888;margin-top:3px">중요도 × 긴급도 4분면 · 완료 업무 제외</div>
    </div>
    <div style="display:grid;grid-template-columns:34px 1fr 1fr;grid-template-rows:34px 1fr 1fr;gap:10px;height:${MAIN_HEIGHT}px">
      <div style="grid-column:2;grid-row:1;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;color:#888">긴급도 높음 →</div>
      <div style="grid-column:3;grid-row:1;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;color:#888">긴급도 낮음</div>
      <div style="grid-column:1;grid-row:2;display:flex;align-items:center;justify-content:center;writing-mode:vertical-rl;font-size:12.5px;font-weight:700;color:#888">중요도 높음 ↑</div>
      <div style="grid-column:1;grid-row:3;display:flex;align-items:center;justify-content:center;writing-mode:vertical-rl;font-size:12.5px;font-weight:700;color:#bbb">중요도 낮음</div>
      ${boxes}
    </div>`;
  }

  function renderRecurring(vm) {
    const rows = vm.ruleRows.map(r => `
      <div style="display:grid;grid-template-columns:1.8fr 1fr 1.4fr .9fr 1.3fr .8fr;border-bottom:1px solid #F2F3F5;align-items:center;font-size:13px">
        <div style="padding:13px 16px;font-weight:500">${esc(r.name)}</div>
        <div style="padding:13px 8px"><span style="background:#F5F6F7;border:1px solid #E3E5E8;color:#666;font-size:11.5px;padding:2px 9px;border-radius:4px">${r.cycle}</span></div>
        <div style="padding:13px 8px;color:#666">${esc(r.genPoint)}</div>
        <div style="padding:13px 8px;text-align:center;color:#666">${r.alertDays}일 전</div>
        <div style="padding:13px 8px;font-weight:700;color:${r.nextColor}">${r.nextGen}</div>
        <div style="padding:13px 8px;display:flex;justify-content:center">
          <button data-action="toggleRule" data-id="${r.id}" style="${r.toggleStyle}"><span style="${r.knobStyle}"></span></button>
        </div>
      </div>`).join('');
    return `
    <div style="margin-bottom:16px">
      <h1 style="margin:0;font-size:20px;font-weight:900;letter-spacing:-.4px">반복 일정 설정</h1>
      <div style="font-size:12.5px;color:#888;margin-top:3px">주기가 도래하면 업무가 자동 생성되고 사전 알림일부터 대시보드에 노출됩니다</div>
    </div>
    <div style="background:#fff;border:1px solid #E3E5E8;border-radius:8px;overflow:hidden;height:${MAIN_HEIGHT}px;display:flex;flex-direction:column">
      <div style="display:grid;grid-template-columns:1.8fr 1fr 1.4fr .9fr 1.3fr .8fr;background:#F5F6F7;border-bottom:1px solid #E3E5E8;font-size:11.5px;font-weight:700;color:#888">
        <div style="padding:11px 16px">규칙명</div>
        <div style="padding:11px 8px">주기</div>
        <div style="padding:11px 8px">생성 시점</div>
        <div style="padding:11px 8px;text-align:center">사전 알림</div>
        <div style="padding:11px 8px">다음 생성 예정일</div>
        <div style="padding:11px 8px;text-align:center">활성</div>
      </div>
      <div style="flex:1;overflow:auto">${rows}</div>
    </div>`;
  }

  function renderGoals(vm) {
    const cards = vm.goalDetails.map(g => `
      <div style="background:#fff;border:1px solid #E3E5E8;border-radius:8px;overflow:hidden">
        <div style="display:flex;align-items:center;gap:18px;padding:16px 20px;border-bottom:1px solid #EEF0F2">
          <div style="position:relative;width:66px;height:66px;flex:none">
            <svg width="66" height="66" viewBox="0 0 66 66" style="transform:rotate(-90deg)">
              <circle cx="33" cy="33" r="27" fill="none" stroke="#EEF0F2" stroke-width="8"></circle>
              <circle cx="33" cy="33" r="27" fill="none" stroke="${g.color}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${g.dash}"></circle>
            </svg>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:900;color:#F37321">${g.pct}%</div>
          </div>
          <div style="flex:1">
            <div style="font-size:16px;font-weight:900">${esc(g.name)}</div>
            <div style="font-size:12.5px;color:#888;margin-top:3px">${esc(g.subtitle)}</div>
          </div>
          <div style="${g.tagStyle}">${g.tag}</div>
          <button data-action="openEditGoal" data-id="${g.id}" style="border:1px solid #E3E5E8;background:#fff;color:#666;font-weight:700;font-size:12px;padding:6px 12px;border-radius:6px;cursor:pointer">수정</button>
        </div>
        <div style="padding:6px 20px 14px">
          ${g.tasks.map(t => `
            <div data-action="openEdit" data-id="${t.id}" style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #F5F6F7;cursor:pointer">
              <span style="${t.typeBadgeStyle}">${t.typeLabel}</span>${recurBadge(t)}
              <span style="font-size:13px;font-weight:500;flex:none;width:230px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.name)}</span>
              <div style="flex:1;height:7px;background:#EEF0F2;border-radius:4px;overflow:hidden">
                <div style="height:100%;border-radius:4px;background:${t.barColor};width: ${t.progress}%"></div>
              </div>
              <span style="font-size:12.5px;font-weight:900;width:38px;text-align:right">${t.progress}%</span>
              <span style="${t.ddayStyle}">${t.ddayLabel}</span>
            </div>`).join('')}
        </div>
      </div>`).join('');
    return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div>
        <h1 style="margin:0;font-size:20px;font-weight:900;letter-spacing:-.4px">연간 목표 관리</h1>
        <div style="font-size:12.5px;color:#888;margin-top:3px">${vm.goalYear}년 · 목표별 달성 방식(진행률 평균/수치 목표/업무 완료 건수)에 따라 자동 집계</div>
      </div>
      <button data-action="openNewGoal" style="background:#F37321;color:#fff;border:none;font-weight:700;font-size:13px;padding:9px 18px;border-radius:20px;cursor:pointer;box-shadow:0 1px 3px rgba(243,115,33,.35)">+ 새 목표 추가</button>
    </div>
    <div style="height:${MAIN_HEIGHT}px;overflow:auto;display:flex;flex-direction:column;gap:14px">
      ${cards || `<div style="background:#fff;border:1px solid #E3E5E8;border-radius:8px;padding:40px;text-align:center;color:#aaa;font-size:13px">등록된 목표가 없습니다. "+ 새 목표 추가"로 첫 목표를 만들어보세요.</div>`}
    </div>`;
  }

  const lblStyle = 'display:block;font-size:12px;font-weight:700;color:#666;margin-bottom:6px';
  const inpStyle = 'width:100%;height:38px;border:1px solid #E3E5E8;border-radius:7px;padding:0 12px;font-size:13.5px;color:#333;background:#fff';
  const selStyle = 'width:100%;height:38px;border:1px solid #E3E5E8;border-radius:7px;padding:0 10px;font-size:13.5px;color:#333;background:#fff';
  const areaStyle = 'width:100%;border:1px solid #E3E5E8;border-radius:7px;padding:9px 12px;font-size:13.5px;color:#333;background:#fff;resize:vertical';

  function renderModal(vm) {
    if (!vm.modalOpen) return '';
    const f = vm.form;
    const goalOptions = vm.goalOptions.map(o => `<option value="${o.id}" ${f.goalId === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('');
    const impBtns = vm.impBtns.map(b => `<button data-action="setImp" data-value="${b.value}" style="${b.style}">${b.label}</button>`).join('');
    const urgBtns = vm.urgBtns.map(b => `<button data-action="setUrg" data-value="${b.value}" style="${b.style}">${b.label}</button>`).join('');
    return `
    <div style="position:fixed;inset:0;background:rgba(30,32,36,.5);z-index:50;display:flex;align-items:flex-start;justify-content:center;padding:60px 20px;overflow:auto;animation:ovIn .12s ease">
      <div style="width:640px;background:#fff;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.25);animation:mdIn .16s ease">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid #EEF0F2">
          <span style="font-size:16px;font-weight:900">${vm.modalTitle}</span>
          <button data-action="closeModal" style="border:none;background:none;font-size:22px;color:#aaa;cursor:pointer;line-height:1">×</button>
        </div>
        <div style="padding:22px 24px;display:grid;grid-template-columns:1fr 1fr;gap:16px 18px">
          <div style="grid-column:1/3">
            <label style="${lblStyle}">업무명</label>
            <input id="f-name" data-action="fName" value="${esc(f.name)}" placeholder="업무명을 입력하세요" style="${inpStyle}">
          </div>
          <div style="grid-column:1/3">
            <label style="${lblStyle}">설명</label>
            <textarea id="f-desc" data-action="fDesc" rows="2" placeholder="업무 설명" style="${areaStyle}">${esc(f.desc)}</textarea>
          </div>
          <div>
            <label style="${lblStyle}">유형</label>
            <select id="f-type" data-action="fType" style="${selStyle}">
              <option value="ongoing" ${f.type === 'ongoing' ? 'selected' : ''}>지속 업무</option>
              <option value="goal" ${f.type === 'goal' ? 'selected' : ''}>목표 과제</option>
              <option value="simple" ${f.type === 'simple' ? 'selected' : ''}>단순 업무</option>
              <option value="personal" ${f.type === 'personal' ? 'selected' : ''}>개인 일정</option>
            </select>
          </div>
          <div>
            <label style="${lblStyle}">연결 목표</label>
            <select id="f-goal" data-action="fGoal" style="${selStyle}">
              <option value="" ${!f.goalId ? 'selected' : ''}>— 없음 —</option>
              ${goalOptions}
            </select>
          </div>
          <div>
            <label style="${lblStyle}">시작일</label>
            <input id="f-start" type="date" data-action="fStart" value="${f.start}" style="${inpStyle}">
          </div>
          <div>
            <label style="${lblStyle}">마감일</label>
            <input id="f-due" type="date" data-action="fDue" value="${f.due}" style="${inpStyle}">
          </div>
          <div>
            <label style="${lblStyle}">중요도</label>
            <div style="display:flex;gap:6px">${impBtns}</div>
          </div>
          <div>
            <label style="${lblStyle}">긴급도</label>
            <div style="display:flex;gap:6px">${urgBtns}</div>
          </div>
          <div style="grid-column:1/3;display:flex;align-items:center;gap:10px;padding:2px 0">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:700;color:#444">
              <input type="checkbox" id="f-isrecur" data-action="fIsRecur" ${vm.isRecurringTask ? 'checked' : ''} style="width:16px;height:16px;accent-color:#F37321;cursor:pointer">
              반복 업무로 등록
            </label>
          </div>
          ${vm.isRecurringTask ? `
          <div style="grid-column:1/3">
            <label style="${lblStyle}">반복 주기</label>
            <select id="f-recur-cycle" data-action="fRecurCycle" style="${selStyle}">
              <option value="매월" ${f.recur === '매월' ? 'selected' : ''}>매월</option>
              <option value="매분기" ${f.recur === '매분기' ? 'selected' : ''}>매분기</option>
              <option value="매년" ${f.recur === '매년' ? 'selected' : ''}>매년</option>
              <option value="2년" ${f.recur === '2년' ? 'selected' : ''}>2년</option>
              <option value="3년" ${f.recur === '3년' ? 'selected' : ''}>3년</option>
            </select>
          </div>` : ''}
          <div style="grid-column:1/3">
            <label style="${lblStyle}">진행률 · ${f.progress}%</label>
            <input id="f-progress" type="range" min="0" max="100" step="5" value="${f.progress}" data-action="fProg" style="width:100%;accent-color:#F37321;cursor:pointer">
          </div>
          <div style="grid-column:1/3">
            <label style="${lblStyle}">메모</label>
            <textarea id="f-memo" data-action="fMemo" rows="2" placeholder="메모" style="${areaStyle}">${esc(f.memo)}</textarea>
          </div>
          <div style="grid-column:1/3;background:#FFF7F1;border:1px solid #FADFC9;border-radius:7px;padding:11px 14px;display:flex;align-items:center;gap:10px">
            <span style="font-size:12.5px;color:#7a4a24;font-weight:700">예상 우선순위 점수</span>
            <span style="font-size:20px;font-weight:900;color:#F37321">${vm.formScore}</span>
            <span style="font-size:11.5px;color:#a06a3f">= 중요도×2 + 긴급도 + 마감 가중치</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-top:1px solid #EEF0F2">
          ${vm.isEditing ? `<button data-action="deleteTask" style="border:1px solid #F1C6C4;background:#fff;color:#E53935;font-weight:700;font-size:13px;padding:9px 16px;border-radius:7px;cursor:pointer">삭제</button>` : '<div></div>'}
          <div style="display:flex;gap:10px;margin-left:auto">
            ${vm.isEditing && f.progress < 100 ? `<button data-action="completeTask" style="border:1px solid #2f9e78;background:#fff;color:#2f9e78;font-weight:700;font-size:13px;padding:9px 16px;border-radius:7px;cursor:pointer">완료 처리</button>` : ''}
            <button data-action="closeModal" style="border:1px solid #E3E5E8;background:#fff;color:#666;font-weight:700;font-size:13px;padding:9px 18px;border-radius:7px;cursor:pointer">취소</button>
            <button data-action="saveTask" style="border:none;background:#F37321;color:#fff;font-weight:700;font-size:13px;padding:9px 22px;border-radius:7px;cursor:pointer">저장</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  function renderGoalModal(vm) {
    if (!vm.goalModalOpen) return '';
    const f = vm.goalForm;
    const metricNote = f.metricType === 'count'
      ? '<div style="font-size:12px;color:#888;background:#F5F6F7;border-radius:7px;padding:10px 12px">연결된 업무 중 "완료" 처리된 건수 비율로 자동 계산됩니다.</div>'
      : f.metricType === 'progress'
        ? '<div style="font-size:12px;color:#888;background:#F5F6F7;border-radius:7px;padding:10px 12px">연결된 업무들의 진행률 평균으로 자동 계산됩니다.</div>'
        : '';
    const numericFields = f.metricType === 'numeric' ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="${lblStyle}">목표 수치</label>
          <input id="gf-target" type="text" inputmode="decimal" data-action="gfTarget" value="${f.targetValue}" style="${inpStyle}">
        </div>
        <div>
          <label style="${lblStyle}">단위</label>
          <input id="gf-unit" data-action="gfUnit" value="${esc(f.targetUnit)}" placeholder="예: 억원" style="${inpStyle}">
        </div>
      </div>
      <div>
        <label style="${lblStyle}">현재 값</label>
        <input id="gf-current" type="text" inputmode="decimal" data-action="gfCurrent" value="${f.currentValue}" style="${inpStyle}">
      </div>
      <div style="background:#FFF7F1;border:1px solid #FADFC9;border-radius:7px;padding:11px 14px;display:flex;align-items:center;gap:10px">
        <span style="font-size:12.5px;color:#7a4a24;font-weight:700">예상 달성률</span>
        <span style="font-size:20px;font-weight:900;color:#F37321">${vm.goalFormPct}%</span>
      </div>` : '';
    return `
    <div style="position:fixed;inset:0;background:rgba(30,32,36,.5);z-index:50;display:flex;align-items:flex-start;justify-content:center;padding:60px 20px;overflow:auto;animation:ovIn .12s ease">
      <div style="width:440px;background:#fff;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.25);animation:mdIn .16s ease">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid #EEF0F2">
          <span style="font-size:16px;font-weight:900">${vm.goalModalTitle}</span>
          <button data-action="closeGoalModal" style="border:none;background:none;font-size:22px;color:#aaa;cursor:pointer;line-height:1">×</button>
        </div>
        <div style="padding:22px 24px;display:flex;flex-direction:column;gap:16px">
          <div>
            <label style="${lblStyle}">목표명</label>
            <input id="gf-name" data-action="gfName" value="${esc(f.name)}" placeholder="예: 업무 프로세스 표준화" style="${inpStyle}">
          </div>
          <div>
            <label style="${lblStyle}">연도</label>
            <input id="gf-year" type="text" inputmode="numeric" data-action="gfYear" value="${f.year}" style="${inpStyle}">
          </div>
          <div>
            <label style="${lblStyle}">달성 방식</label>
            <select id="gf-metric" data-action="gfMetric" style="${selStyle}">
              <option value="progress" ${f.metricType === 'progress' ? 'selected' : ''}>진행률 평균 (연결 업무 진행률 평균)</option>
              <option value="numeric" ${f.metricType === 'numeric' ? 'selected' : ''}>수치 목표 (예: 비용 절감액)</option>
              <option value="count" ${f.metricType === 'count' ? 'selected' : ''}>업무 완료 건수 (완료 수 / 전체 수)</option>
            </select>
          </div>
          ${metricNote}
          ${numericFields}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-top:1px solid #EEF0F2">
          ${vm.isEditingGoal ? `<button data-action="deleteGoal" style="border:1px solid #F1C6C4;background:#fff;color:#E53935;font-weight:700;font-size:13px;padding:9px 16px;border-radius:7px;cursor:pointer">삭제</button>` : '<div></div>'}
          <div style="display:flex;gap:10px;margin-left:auto">
            <button data-action="closeGoalModal" style="border:1px solid #E3E5E8;background:#fff;color:#666;font-weight:700;font-size:13px;padding:9px 18px;border-radius:7px;cursor:pointer">취소</button>
            <button data-action="saveGoal" style="border:none;background:#F37321;color:#fff;font-weight:700;font-size:13px;padding:9px 22px;border-radius:7px;cursor:pointer">저장</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  const VIEW_RENDERERS = {
    home: renderHome,
    tasks: renderTasks,
    matrix: renderMatrix,
    recurring: renderRecurring,
    goals: renderGoals,
  };

  App.renderApp = function (vm) {
    const body = (VIEW_RENDERERS[vm.view] || renderHome)(vm);
    return `
    <div style="min-width:1440px;max-width:1920px;margin:0 auto;background:#ECEDEF;min-height:100vh">
      ${renderHeader(vm)}
      ${renderAlerts(vm)}
      <div style="padding:20px 28px 48px">${body}</div>
      ${renderModal(vm)}
      ${renderGoalModal(vm)}
    </div>`;
  };
})();
