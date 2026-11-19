const QUOTES_BY_TAB = {
  food: [
    "阿咩豹鼓起嘴筒子闻到香味啦！今天要把哪顿好吃的记进手账呀？",
    "豆豆眉一扬，发现必吃美味！快传几张照片馋馋以后的我们～",
    "两个人一起吃过的每一碗热汤和小吃，阿咩豹都帮你们盖好章啦！",
    "不知道回忆哪顿好？点点我的小嘴筒子，帮你们翻翻高分美食！",
    "每一座城市的味道都不一样，写下你们两个人的嘴替评语吧～"
  ],
  spot: [
    "背好小相机出发咯！这片海风和日落，阿咩豹帮你们永远留住～",
    "豆豆眉认真对焦中……咔嚓！又是你们并肩看风景的一天！",
    "不管是山顶日出还是老巷散步，只要两个人一起走就很浪漫呀。",
    "记得给去过的景点标上城市，阿咩豹会自动整理进地点足迹册哦！"
  ],
  places: [
    "看看你们一起点亮了多少座城市！阿咩豹的小肚皮里装满明信片啦～",
    "点开任意一座城市邮戳，就能一口气重温那里的美食和风景哦！",
    "慢慢走，以后还要陪你们把更多地方盖满海豹小爪印！"
  ],
  murmurs: [
    "这里是阿咩豹守护的悄悄话漂流瓶，旅途中的碎碎念尽管丢进来～",
    "高铁上的小期待、深夜的开心瞬间，写下来给对方点个小心心吧！",
    "阿咩豹把耳朵贴在冰面上听着呢，今天有什么想对TA说的小话呀？"
  ],
  plans: [
    "小背包已经塞好小鱼干啦！我们下一站准备去哪里探险呀？",
    "先把想吃的店和想看的风景列进清单，出发去打卡还能一键转游记哦！",
    "只要想到下一次又能和喜欢的人出发，阿咩豹的豆豆眉都在跳舞～"
  ]
};

const PAT_QUOTES = [
  "咩呜～嘴筒子被揉得软乎乎的，今天也要开开心心哦！",
  "豆豆眉开心得飞起来啦！阿咩豹最喜欢帮你们记游记了～",
  "翻个小肚皮拍拍肉鳍，祝你们下一趟旅行全是好天气！",
  "唔姆唔姆，嘴筒子里藏了一颗小海星送给你们两个！",
  "摸摸阿咩豹，烦恼全跑掉，好吃的好玩的快到碗里来～"
];

let quoteCursor = 0;
let patCursor = 0;

export function nextAmeibaoQuote(tab = "food") {
  const pool = QUOTES_BY_TAB[tab] || QUOTES_BY_TAB.food;
  quoteCursor = (quoteCursor + 1) % pool.length;
  return pool[quoteCursor];
}

export function nextPatQuote() {
  const text = PAT_QUOTES[patCursor % PAT_QUOTES.length];
  patCursor += 1;
  return text;
}

/**
 * 绘制斑海豹幼崽「阿咩豹」的核心面部：
 * 1. 圆润灵动的豆豆眉（可随情绪微调角度）
 * 2. 水汪汪黑曜石大眼睛 + 双高光
 * 3. 标志性立体鼓鼓「花生形嘴筒子」（双胡须垫 + 鼻头 + 毛孔点点 + 胡须 + 小下巴）
 */
function renderSpottedSealFace({
  cx = 100,
  cy = 92,
  eyeStyle = "glossy",
  browMood = "curious",
  chewing = false,
  uid = "m"
} = {}) {
  const leftBrowRotate =
    browMood === "happy" ? -12 : browMood === "soft" ? -16 : browMood === "excited" ? 6 : -7;
  const rightBrowRotate =
    browMood === "happy" ? 12 : browMood === "soft" ? 16 : browMood === "excited" ? -6 : 7;
  const browOffsetY = browMood === "happy" || browMood === "excited" ? -2.5 : 0;

  const lx = cx - 26;
  const rx = cx + 26;
  const eyeY = cy - 6;
  const browY = cy - 22 + browOffsetY;
  const muzzleY = cy + 12.5;

  const eyesMarkup =
    eyeStyle === "happy"
      ? `
        <path d="M${lx - 8.5} ${eyeY + 2} Q${lx} ${eyeY - 8.5} ${lx + 8.5} ${eyeY + 2}" stroke="#2A201B" stroke-width="3.6" stroke-linecap="round" fill="none"/>
        <path d="M${rx - 8.5} ${eyeY + 2} Q${rx} ${eyeY - 8.5} ${rx + 8.5} ${eyeY + 2}" stroke="#2A201B" stroke-width="3.6" stroke-linecap="round" fill="none"/>
      `
      : `
        <g class="ameibao-eyes">
          <!-- 斑海豹幼崽浅白眼圈绒毛感 -->
          <circle cx="${lx}" cy="${eyeY}" r="11.2" fill="#FFFFFF" fill-opacity="0.9"/>
          <circle cx="${rx}" cy="${eyeY}" r="11.2" fill="#FFFFFF" fill-opacity="0.9"/>

          <circle cx="${lx}" cy="${eyeY}" r="9.2" fill="#261C18"/>
          <circle cx="${lx - 3}" cy="${eyeY - 3.2}" r="3.3" fill="#FFFFFF"/>
          <circle cx="${lx + 3.2}" cy="${eyeY + 3.2}" r="1.55" fill="#FFFFFF" fill-opacity="0.92"/>

          <circle cx="${rx}" cy="${eyeY}" r="9.2" fill="#261C18"/>
          <circle cx="${rx - 3}" cy="${eyeY - 3.2}" r="3.3" fill="#FFFFFF"/>
          <circle cx="${rx + 3.2}" cy="${eyeY + 3.2}" r="1.55" fill="#FFFFFF" fill-opacity="0.92"/>
        </g>
      `;

  return `
    <defs>
      <linearGradient id="muzzleGrad_${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="55%" stop-color="#FBF5EC"/>
        <stop offset="100%" stop-color="#EADCCF"/>
      </linearGradient>
    </defs>

    <!-- 重点特征 1：圆鼓鼓的标志性「豆豆眉」 -->
    <g class="ameibao-brows">
      <ellipse
        class="ameibao-brow-left"
        cx="${lx + 2}"
        cy="${browY}"
        rx="6.4"
        ry="4.5"
        transform="rotate(${leftBrowRotate} ${lx + 2} ${browY})"
        fill="#534238"
      />
      <ellipse
        cx="${lx + 0.3}"
        cy="${browY - 1.2}"
        rx="2"
        ry="1.2"
        transform="rotate(${leftBrowRotate} ${lx + 2} ${browY})"
        fill="#7D685B"
        fill-opacity="0.65"
      />
      <ellipse
        class="ameibao-brow-right"
        cx="${rx - 2}"
        cy="${browY}"
        rx="6.4"
        ry="4.5"
        transform="rotate(${rightBrowRotate} ${rx - 2} ${browY})"
        fill="#534238"
      />
      <ellipse
        cx="${rx - 3.7}"
        cy="${browY - 1.2}"
        rx="2"
        ry="1.2"
        transform="rotate(${rightBrowRotate} ${rx - 2} ${browY})"
        fill="#7D685B"
        fill-opacity="0.65"
      />
    </g>

    <!-- 暖粉小腮红 -->
    <ellipse cx="${cx - 39}" cy="${cy + 5}" rx="9.2" ry="5.2" fill="#F6A39E" fill-opacity="0.64"/>
    <ellipse cx="${cx + 39}" cy="${cy + 5}" rx="9.2" ry="5.2" fill="#F6A39E" fill-opacity="0.64"/>

    <!-- 大眼睛 -->
    ${eyesMarkup}

    <!-- 重点特征 2：立体鼓鼓的花生形「嘴筒子」（胡须垫 + 湿润小鼻头 + 下巴） -->
    <g class="ameibao-muzzle">
      <!-- 嘴筒子底部立体投影，突出向前鼓起的体积感 -->
      <ellipse cx="${cx}" cy="${muzzleY + 7.5}" rx="23.5" ry="11" fill="#B8A391" fill-opacity="0.3"/>

      <!-- 嘴筒子下方小下巴 / 粉嫩小嘴缝 -->
      <ellipse
        cx="${cx}"
        cy="${muzzleY + 10.5}"
        rx="${chewing ? 7.8 : 6.2}"
        ry="${chewing ? 5.6 : 4.2}"
        fill="${chewing ? "#EE928F" : "#F3E8DC"}"
        stroke="#534238"
        stroke-width="2.2"
      />

      <!-- 鼓鼓囊囊的双团花生形嘴筒子主体 -->
      <path
        d="M ${cx - 21.5} ${muzzleY - 0.5}
           C ${cx - 22.5} ${muzzleY - 10.5}, ${cx - 9.5} ${muzzleY - 12.5}, ${cx} ${muzzleY - 8}
           C ${cx + 9.5} ${muzzleY - 12.5}, ${cx + 22.5} ${muzzleY - 10.5}, ${cx + 21.5} ${muzzleY - 0.5}
           C ${cx + 23} ${muzzleY + 10.5}, ${cx + 10} ${muzzleY + 14}, ${cx} ${muzzleY + 7.5}
           C ${cx - 10} ${muzzleY + 14}, ${cx - 23} ${muzzleY + 10.5}, ${cx - 21.5} ${muzzleY - 0.5} Z"
        fill="url(#muzzleGrad_${uid})"
        stroke="#534238"
        stroke-width="2.6"
        stroke-linejoin="round"
      />

      <!-- 左右两团嘴筒子高光 -->
      <ellipse cx="${cx - 10.5}" cy="${muzzleY - 4.2}" rx="5.5" ry="2.8" fill="#FFFFFF" fill-opacity="0.88"/>
      <ellipse cx="${cx + 10.5}" cy="${muzzleY - 4.2}" rx="5.5" ry="2.8" fill="#FFFFFF" fill-opacity="0.88"/>

      <!-- 人中竖线与 ω 嘴线 -->
      <path
        d="M ${cx} ${muzzleY - 2.5} L ${cx} ${muzzleY + 7.2}"
        stroke="#534238"
        stroke-width="2.3"
        stroke-linecap="round"
      />

      <!-- 湿润心形海豹小鼻头 -->
      <path
        d="M ${cx} ${muzzleY - 1.8}
           C ${cx - 5} ${muzzleY - 4.8}, ${cx - 7.5} ${muzzleY - 8.5}, ${cx - 4.4} ${muzzleY - 10.6}
           C ${cx - 2} ${muzzleY - 12}, ${cx + 2} ${muzzleY - 12}, ${cx + 4.4} ${muzzleY - 10.6}
           C ${cx + 7.5} ${muzzleY - 8.5}, ${cx + 5} ${muzzleY - 4.8}, ${cx} ${muzzleY - 1.8} Z"
        fill="#2B211C"
      />
      <ellipse cx="${cx - 1.6}" cy="${muzzleY - 8.8}" rx="1.7" ry="0.95" fill="#FFFFFF" fill-opacity="0.76"/>

      <!-- 嘴筒子上的斑海豹胡须小毛孔点点 -->
      <circle cx="${cx - 13.5}" cy="${muzzleY - 0.5}" r="1.25" fill="#8B7566"/>
      <circle cx="${cx - 9}" cy="${muzzleY + 2.2}" r="1.25" fill="#8B7566"/>
      <circle cx="${cx - 15}" cy="${muzzleY + 4.2}" r="1.15" fill="#8B7566"/>
      <circle cx="${cx + 13.5}" cy="${muzzleY - 0.5}" r="1.25" fill="#8B7566"/>
      <circle cx="${cx + 9}" cy="${muzzleY + 2.2}" r="1.25" fill="#8B7566"/>
      <circle cx="${cx + 15}" cy="${muzzleY + 4.2}" r="1.15" fill="#8B7566"/>

      <!-- 嘴筒子两侧微弯弹性小胡须 -->
      <path
        d="M ${cx - 20} ${muzzleY - 1.5} Q ${cx - 32} ${muzzleY - 4} ${cx - 41} ${muzzleY}
           M ${cx - 20.5} ${muzzleY + 3} Q ${cx - 33} ${muzzleY + 3.5} ${cx - 42} ${muzzleY + 8.5}
           M ${cx - 18} ${muzzleY + 6.8} Q ${cx - 29} ${muzzleY + 9} ${cx - 36} ${muzzleY + 14.5}
           M ${cx + 20} ${muzzleY - 1.5} Q ${cx + 32} ${muzzleY - 4} ${cx + 41} ${muzzleY}
           M ${cx + 20.5} ${muzzleY + 3} Q ${cx + 33} ${muzzleY + 3.5} ${cx + 42} ${muzzleY + 8.5}
           M ${cx + 18} ${muzzleY + 6.8} Q ${cx + 29} ${muzzleY + 9} ${cx + 36} ${muzzleY + 14.5}"
        stroke="#7D695C"
        stroke-width="1.65"
        stroke-linecap="round"
        fill="none"
      />
    </g>
  `;
}

function renderExplorerHat({ cx = 100, topY = 26, rotate = -4 } = {}) {
  return `
    <g class="ameibao-hat" transform="rotate(${rotate} ${cx} ${topY + 18})">
      <!-- 旅行小渔夫帽帽檐（稳稳戴在头顶，完全露出豆豆眉） -->
      <ellipse cx="${cx}" cy="${topY + 22}" rx="39" ry="9.5" fill="#69A7D6" stroke="#534238" stroke-width="2.6"/>
      <!-- 帽冠 -->
      <path
        d="M ${cx - 27} ${topY + 20}
           C ${cx - 26} ${topY + 3}, ${cx - 14} ${topY}, ${cx} ${topY}
           C ${cx + 14} ${topY}, ${cx + 26} ${topY + 3}, ${cx + 27} ${topY + 20} Z"
        fill="#84BCE6"
        stroke="#534238"
        stroke-width="2.6"
        stroke-linejoin="round"
      />
      <!-- 暖米色帽带 + 小海星徽章 -->
      <path
        d="M ${cx - 26.5} ${topY + 17} Q ${cx} ${topY + 21} ${cx + 26.5} ${topY + 17}"
        stroke="#FCEAD2"
        stroke-width="5"
        stroke-linecap="round"
        fill="none"
      />
      <circle cx="${cx + 14}" cy="${topY + 15.5}" r="4.3" fill="#F7BE59" stroke="#534238" stroke-width="1.5"/>
    </g>
  `;
}

let uidSeed = 1;

export function getAmeibaoSvg({ mood = "guide", size = 128, className = "" } = {}) {
  const uid = `s${(uidSeed += 1)}`;

  if (mood === "peek") {
    return `
      <svg class="ameibao-svg ameibao-mood-peek ${className}" width="${size}" height="${Math.round(
        size * 0.78
      )}" viewBox="0 0 210 164" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="furPeek_${uid}" cx="50%" cy="38%" r="64%">
            <stop offset="0%" stop-color="#FFFFFF"/>
            <stop offset="70%" stop-color="#FAF6EE"/>
            <stop offset="100%" stop-color="#E2ECF5"/>
          </radialGradient>
        </defs>

        <!-- 海水小泡泡 -->
        <circle class="ameibao-bubble b1" cx="26" cy="58" r="5" fill="#DFF0FC" fill-opacity="0.88" stroke="#FFFFFF" stroke-width="1.5"/>
        <circle class="ameibao-bubble b2" cx="184" cy="46" r="4.2" fill="#DFF0FC" fill-opacity="0.88" stroke="#FFFFFF" stroke-width="1.4"/>
        <circle class="ameibao-bubble b3" cx="174" cy="68" r="2.6" fill="#FFFFFF" fill-opacity="0.92"/>

        <!-- 圆滚滚的斑海豹幼崽上半身 -->
        <path
          d="M 40 148 C 36 92, 58 50, 105 50 C 152 50, 174 92, 170 148 Z"
          fill="url(#furPeek_${uid})"
          stroke="#534238"
          stroke-width="3"
          stroke-linejoin="round"
        />

        <!-- 旅行小圆帽（稳稳扣在毛茸茸头顶，露出豆豆眉） -->
        ${renderExplorerHat({ cx: 105, topY: 28, rotate: -4 })}

        <!-- 斑海豹幼崽标志性浅灰奶斑（头侧与肩背） -->
        <g fill="#C6D3E0" fill-opacity="0.68">
          <ellipse cx="66" cy="75" rx="5.2" ry="3.4" transform="rotate(-22 66 75)"/>
          <ellipse cx="58" cy="84" rx="3.5" ry="2.5" transform="rotate(-15 58 84)"/>
          <ellipse cx="144" cy="76" rx="5.5" ry="3.5" transform="rotate(24 144 76)"/>
          <ellipse cx="152" cy="86" rx="3.5" ry="2.4" transform="rotate(18 152 86)"/>
        </g>

        <!-- 脸颊软绒毛 -->
        <path d="M41 106 Q33 109 39 116 M169 106 Q177 109 171 116" stroke="#534238" stroke-width="2.6" stroke-linecap="round"/>

        <!-- 焦糖色斜挎相机背带 + 小领巾 -->
        <path d="M68 128 Q105 142 142 128" stroke="#E88B6B" stroke-width="6.5" stroke-linecap="round" fill="none"/>
        <path d="M73 125 L128 148" stroke="#B97B48" stroke-width="4.5" stroke-linecap="round"/>

        <!-- 豆豆眉 + 水润大眼 + 立体嘴筒子 -->
        ${renderSpottedSealFace({ cx: 105, cy: 96, eyeStyle: "glossy", browMood: "curious", uid })}

        <!-- 扒在栏杆边的小前鳍（带斑海豹小爪印线） -->
        <g class="ameibao-paw-left">
          <ellipse cx="54" cy="144" rx="17" ry="10.5" transform="rotate(-12 54 144)" fill="#FAF6EE" stroke="#534238" stroke-width="2.8"/>
          <path d="M45 144 L49 149 M52 142 L55 148 M59 142 L61 147" stroke="#8C796B" stroke-width="1.6" stroke-linecap="round"/>
        </g>
        <g class="ameibao-paw-right">
          <ellipse cx="156" cy="144" rx="17" ry="10.5" transform="rotate(12 156 144)" fill="#FAF6EE" stroke="#534238" stroke-width="2.8"/>
          <path d="M165 144 L161 149 M158 142 L155 148 M151 142 L149 147" stroke="#8C796B" stroke-width="1.6" stroke-linecap="round"/>
        </g>
      </svg>
    `;
  }

  if (mood === "bellyRoll") {
    return `
      <svg class="ameibao-svg ameibao-mood-roll ${className}" width="${size}" height="${size}" viewBox="0 0 220 210" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <radialGradient id="furRoll_${uid}" cx="48%" cy="40%" r="64%">
            <stop offset="0%" stop-color="#FFFFFF"/>
            <stop offset="72%" stop-color="#FAF6EE"/>
            <stop offset="100%" stop-color="#E1ECF5"/>
          </radialGradient>
        </defs>

        <path class="ameibao-heart h1" d="M40 54 C34 47, 24 49, 24 57 C24 65, 40 73, 40 73 C40 73, 56 65, 56 57 C56 49, 46 47, 40 54 Z" fill="#F07B78"/>
        <path class="ameibao-heart h2" d="M182 46 C177 40, 168 42, 168 49 C168 56, 182 63, 182 63 C182 63, 196 56, 196 49 C196 42, 187 40, 182 46 Z" fill="#F59B95"/>
        <path class="ameibao-sparkle s1" d="M112 16 L115 24 L123 27 L115 30 L112 38 L109 30 L101 27 L109 24 Z" fill="#F6C45B"/>

        <ellipse cx="110" cy="188" rx="68" ry="11" fill="#C7B6A2" fill-opacity="0.3"/>

        <g class="ameibao-roll-body">
          <!-- 翘起来的小尾鳍 -->
          <path d="M160 145 C184 135, 196 147, 186 159 C196 166, 185 180, 163 167 Z" fill="#FAF6EE" stroke="#534238" stroke-width="3" stroke-linejoin="round"/>

          <!-- 躺倒露肚皮的圆滚滚海豹幼崽 -->
          <path d="M46 118 C42 72, 73 48, 109 50 C140 52, 169 76, 176 116 C182 152, 154 178, 108 178 C62 178, 49 152, 46 118 Z" fill="url(#furRoll_${uid})" stroke="#534238" stroke-width="3.1" stroke-linejoin="round"/>

          <!-- 肚皮边缘斑海豹小浅斑 -->
          <g fill="#C5D2DF" fill-opacity="0.72">
            <ellipse cx="154" cy="96" rx="6.5" ry="4.2" transform="rotate(26 154 96)"/>
            <ellipse cx="163" cy="111" rx="4.5" ry="3.2" transform="rotate(15 163 111)"/>
            <ellipse cx="151" cy="152" rx="5.8" ry="3.8" transform="rotate(-18 151 152)"/>
            <circle cx="62" cy="146" r="4"/>
            <circle cx="71" cy="156" r="2.8"/>
          </g>

          ${renderExplorerHat({ cx: 88, topY: 32, rotate: -16 })}

          ${renderSpottedSealFace({ cx: 104, cy: 96, eyeStyle: "happy", browMood: "happy", uid })}

          <!-- 软肚皮拍拍小爱心 -->
          <ellipse cx="108" cy="148" rx="28" ry="18" fill="#FFFFFF" fill-opacity="0.65"/>
          <path d="M108 155 C103 150, 99 147, 99 143.5 C99 141.2, 101 139.5, 103.4 139.5 C105.4 139.5, 107 140.8, 108 142.4 C109 140.8, 110.6 139.5, 112.6 139.5 C115 139.5, 117 141.2, 117 143.5 C117 147, 113 150, 108 155 Z" fill="#F28B86"/>

          <!-- 拍肚皮小肉鳍 -->
          <ellipse class="ameibao-flipper-l" cx="56" cy="128" rx="18" ry="10.5" transform="rotate(-28 56 128)" fill="#FAF6EE" stroke="#534238" stroke-width="2.8"/>
          <ellipse class="ameibao-flipper-r" cx="156" cy="126" rx="18" ry="10.5" transform="rotate(26 156 126)" fill="#FAF6EE" stroke="#534238" stroke-width="2.8"/>
        </g>
      </svg>
    `;
  }

  const isFoodie = mood === "foodie";
  const isJournal = mood === "journal";
  const isPlan = mood === "plan";
  const browMood = isFoodie ? "happy" : isPlan ? "excited" : isJournal ? "soft" : "curious";
  const eyeStyle = isFoodie ? "happy" : "glossy";

  return `
    <svg class="ameibao-svg ameibao-mood-${mood} ${className}" width="${size}" height="${size}" viewBox="0 0 210 210" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="furMain_${uid}" cx="48%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="70%" stop-color="#FAF6EE"/>
          <stop offset="100%" stop-color="#E1ECF5"/>
        </radialGradient>
      </defs>

      <!-- 地面柔和阴影 -->
      <ellipse cx="105" cy="188" rx="60" ry="10.5" fill="#C7B6A2" fill-opacity="0.3"/>

      <!-- 小尾鳍 -->
      <path d="M152 158 C175 151, 186 162, 176 172 C184 179, 173 188, 150 175 Z" fill="#FAF6EE" stroke="#534238" stroke-width="2.8" stroke-linejoin="round"/>

      <!-- 胖乎乎梨形斑海豹幼崽身体 -->
      <path
        d="M 44 138 C 40 88, 61 52, 105 52 C 149 52, 170 88, 166 138 C 164 172, 142 184, 105 184 C 68 184, 46 172, 44 138 Z"
        fill="url(#furMain_${uid})"
        stroke="#534238"
        stroke-width="3"
        stroke-linejoin="round"
      />

      <!-- 斑海豹幼崽背侧软萌小奶斑 -->
      <g fill="#C4D1DF" fill-opacity="0.72">
        <ellipse cx="66" cy="77" rx="5.2" ry="3.4" transform="rotate(-22 66 77)"/>
        <ellipse cx="58" cy="87" rx="3.5" ry="2.4" transform="rotate(-14 58 87)"/>
        <ellipse cx="144" cy="78" rx="5.6" ry="3.6" transform="rotate(24 144 78)"/>
        <ellipse cx="152" cy="88" rx="3.5" ry="2.4" transform="rotate(16 152 88)"/>
        <ellipse cx="145" cy="152" rx="6.2" ry="4" transform="rotate(-16 145 152)"/>
        <circle cx="137" cy="162" r="3"/>
        <circle cx="66" cy="158" r="3.4"/>
      </g>

      <!-- 脸颊绒毛 -->
      <path d="M44 104 Q36 107 42 114 M166 104 Q174 107 168 114" stroke="#534238" stroke-width="2.5" stroke-linecap="round"/>

      <!-- 头顶探险小圆帽 -->
      ${renderExplorerHat({ cx: 105, topY: 30, rotate: -4 })}

      <!-- 暖橘小领巾 -->
      <path d="M66 126 Q105 140 144 126" stroke="#EE8F6E" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M116 133 L124 147 L109 144 Z" fill="#EE8F6E" stroke="#534238" stroke-width="1.8" stroke-linejoin="round"/>

      <!-- 豆豆眉 + 大眼睛 + 特色嘴筒子 -->
      ${renderSpottedSealFace({
        cx: 105,
        cy: 96,
        eyeStyle,
        browMood,
        chewing: isFoodie,
        uid
      })}

      <!-- 不同模块专属随身小道具 -->
      ${
        isFoodie
          ? `
            <!-- 美食模式：捧着三色团子烤串 -->
            <g transform="rotate(-16 105 154)">
              <line x1="76" y1="162" x2="138" y2="146" stroke="#B68049" stroke-width="3.2" stroke-linecap="round"/>
              <circle cx="95" cy="157" r="9.5" fill="#F8B5B2" stroke="#534238" stroke-width="2.2"/>
              <circle cx="111" cy="153" r="9.5" fill="#FFFDF7" stroke="#534238" stroke-width="2.2"/>
              <circle cx="127" cy="149" r="9.5" fill="#A9D19E" stroke="#534238" stroke-width="2.2"/>
            </g>
          `
          : isJournal
            ? `
              <!-- 手账/碎碎念模式：抱着旅行手账本 -->
              <g transform="translate(0, 2)">
                <rect x="78" y="138" width="54" height="38" rx="6" fill="#F5B971" stroke="#534238" stroke-width="2.4"/>
                <line x1="105" y1="139" x2="105" y2="175" stroke="#534238" stroke-width="2"/>
                <rect x="84" y="145" width="15" height="24" rx="2" fill="#FFFDF8"/>
                <rect x="111" y="145" width="15" height="24" rx="2" fill="#FFFDF8"/>
                <path d="M118 159 C116 157, 114 155.5, 114 154 C114 153, 114.9 152.2, 116 152.2 C116.8 152.2, 117.5 152.7, 118 153.5 C118.5 152.7, 119.2 152.2, 120 152.2 C121.1 152.2, 122 153, 122 154 C122 155.5, 120 157, 118 159 Z" fill="#E57370"/>
              </g>
            `
            : isPlan
              ? `
                <!-- 计划模式：举着下一站出发小旗子 -->
                <g transform="rotate(10 148 134)">
                  <line x1="146" y1="102" x2="146" y2="162" stroke="#8C6239" stroke-width="3.2" stroke-linecap="round"/>
                  <path d="M146 104 L182 114 L146 125 Z" fill="#F38375" stroke="#534238" stroke-width="2.2" stroke-linejoin="round"/>
                </g>
              `
              : `
                <!-- 默认导游/景点模式：胸前挂着复古小相机 -->
                <g>
                  <path d="M74 128 L91 148 M136 128 L119 148" stroke="#A66E3E" stroke-width="3" stroke-linecap="round"/>
                  <rect x="84" y="143" width="42" height="29" rx="6" fill="#685951" stroke="#42342C" stroke-width="2.4"/>
                  <rect x="84" y="143" width="42" height="9" rx="4" fill="#D9C7B8" stroke="#42342C" stroke-width="2"/>
                  <circle cx="105" cy="159" r="8.8" fill="#89C0E8" stroke="#FFFDF9" stroke-width="2.4"/>
                  <circle cx="102.5" cy="156.5" r="2.4" fill="#FFFFFF"/>
                  <circle cx="119" cy="148" r="2" fill="#F38375"/>
                </g>
              `
      }

      <!-- 两侧软萌前鳍 -->
      <g>
        <ellipse cx="50" cy="142" rx="16.5" ry="10.2" transform="rotate(-22 50 142)" fill="#FAF6EE" stroke="#534238" stroke-width="2.8"/>
        <path d="M40 145 L45 148 M44 140 L49 144" stroke="#8C796B" stroke-width="1.5" stroke-linecap="round"/>
        <ellipse cx="160" cy="142" rx="16.5" ry="10.2" transform="rotate(22 160 142)" fill="#FAF6EE" stroke="#534238" stroke-width="2.8"/>
        <path d="M170 145 L165 148 M166 140 L161 144" stroke="#8C796B" stroke-width="1.5" stroke-linecap="round"/>
      </g>
    </svg>
  `;
}

export function renderAmeibao(container, options = {}) {
  if (!container) return;
  container.innerHTML = getAmeibaoSvg(options);
}

/**
 * 迷你版阿咩豹头像图标（带豆豆眉与小嘴筒子），避免部分旧系统缺少海豹 Emoji 字形
 */
export function getMiniSealSvg(size = 18) {
  return `<svg class="mini-seal-badge" width="${size}" height="${size}" viewBox="0 0 32 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="vertical-align:-3px;flex-shrink:0;">
    <ellipse cx="16" cy="17" rx="13.5" ry="11.5" fill="#FFFDF9" stroke="#534238" stroke-width="2.1"/>
    <ellipse cx="16" cy="6.2" rx="8.5" ry="2.6" fill="#69A7D6" stroke="#534238" stroke-width="1.6"/>
    <path d="M10.5 5.8 C11 2.2, 21 2.2, 21.5 5.8 Z" fill="#84BCE6" stroke="#534238" stroke-width="1.6"/>
    <ellipse cx="11.2" cy="11.8" rx="2.1" ry="1.4" transform="rotate(-8 11.2 11.8)" fill="#534238"/>
    <ellipse cx="20.8" cy="11.8" rx="2.1" ry="1.4" transform="rotate(8 20.8 11.8)" fill="#534238"/>
    <circle cx="10.8" cy="15.6" r="2.3" fill="#261C18"/>
    <circle cx="10.1" cy="14.9" r="0.8" fill="#FFFFFF"/>
    <circle cx="21.2" cy="15.6" r="2.3" fill="#261C18"/>
    <circle cx="20.5" cy="14.9" r="0.8" fill="#FFFFFF"/>
    <ellipse cx="7.4" cy="18.2" rx="2.2" ry="1.2" fill="#F6A39E" fill-opacity="0.7"/>
    <ellipse cx="24.6" cy="18.2" rx="2.2" ry="1.2" fill="#F6A39E" fill-opacity="0.7"/>
    <path d="M10.6 20 C10.4 17.3, 13.8 17, 16 18.2 C18.2 17, 21.6 17.3, 21.4 20 C21.7 22.8, 18.4 23.6, 16 21.8 C13.6 23.6, 10.3 22.8, 10.6 20 Z" fill="#F7EFE4" stroke="#534238" stroke-width="1.7"/>
    <circle cx="16" cy="18.6" r="1.5" fill="#2B211C"/>
  </svg>`;
}
