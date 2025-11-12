import { GoogleGenAI } from "@google/genai";
import type { GamePackage, ImagePrompt, ImageAsset, GameProposal, UserInput, Meta } from '../types';

let ai: GoogleGenAI | null = null;

/**
 * Lazily initializes and returns the GoogleGenAI client.
 * Throws an error if the API key is not configured, which will be caught by UI-facing functions.
 */
const getAiClient = (): GoogleGenAI => {
    if (ai) {
        return ai;
    }
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API 키가 설정되지 않았습니다. 배포 환경의 환경 변수(Environment Variable) 설정을 확인해주세요.");
    }
    ai = new GoogleGenAI({ apiKey });
    return ai;
};


/**
 * Generates a random, single-sentence board game prompt.
 */
export async function generateRandomPrompt(): Promise<string> {
    const model = 'gemini-flash-latest';
    const prompt = `독창적이고 흥미로운 보드게임 컨셉 아이디어를 한 문장으로 생성해주세요. 다른 설명 없이, 오직 컨셉 아이디어 문장 하나만 한국어로 응답해야 합니다. 예시: "고양이들이 빵집을 운영하는 아기자기한 협력 게임" 또는 "사이버펑크 세계관의 잠입 추리 게임"`;

    try {
        const aiClient = getAiClient();
        const response = await aiClient.models.generateContent({
            model,
            contents: prompt,
        });
        return (response.text ?? '').trim();
    } catch (e) {
        console.error("Failed to generate random prompt:", e);
        if (e instanceof Error) throw e; // Re-throw to be handled by the UI
        return "화성에서 감자 농사짓는 일꾼 놓기 게임"; // Return a default on unexpected failure
    }
}

/**
 * Generates a list of game proposals based on a single user prompt.
 */
export async function generateGameProposals(userInput: UserInput): Promise<GameProposal[]> {
    const model = 'gemini-2.5-pro';

    const prompt = `
[시스템 지시사항: 모든 결과물은 완벽한 한국어로 작성되어야 합니다. 'Deck Building'과 같은 영어 키워드는 허용되지 않으며, 모든 메커니즘과 컨셉은 한국어로 번역해야 합니다.]

당신은 세계적인 보드게임 디자이너 AI입니다. 사용자의 요청을 바탕으로, 이미 검증된 성공작들을 기반으로 한 새로운 아이디어를 제안하는 것이 당신의 핵심 임무입니다.
사용자 요청: "${userInput.prompt}"

당신의 작업 과정은 다음과 같습니다:
1.  **요청 분석:** 사용자의 요청에서 핵심 테마, 메커니즘, 또는 특정 게임 이름을 파악합니다.
2.  **영감을 줄 게임 선택:** 당신의 방대한 보드게임 지식에서, 평가가 높은 실제 보드게임 6개를 **서로 다르게** 선택하여 각 제안의 기반으로 삼습니다. 이 게임들은 제안의 다양성을 확보하기 위해 사용됩니다.
3.  **6개의 제안 생성:** 창의성 수준에 따라 분류된 총 6개의 게임 제안을 생성합니다. 각 제안은 위에서 선택한 고유한 게임으로부터 영감을 받아야 합니다.

창의성 분류:
1.  **안정형 (Stable)**: 2개의 제안. 사용자의 요청을 충실하게 해석하며, 영감을 받은 게임을 견고한 기반으로 사용합니다.
2.  **균형형 (Balanced)**: 2개의 제안. 영감을 받은 게임의 핵심 메커니즘과 사용자의 요청을 결합하여 새로운 재미를 만들어냅니다.
3.  **실험형 (Experimental)**: 2개의 제안. 영감을 받은 게임의 정신을 계승하되, 사용자의 요청을 바탕으로 매우 혁신적인 방향으로 컨셉을 확장합니다.

6개의 각 제안에 대해 다음 항목을 반드시 포함해야 합니다:
1.  **creativitySource**: 창의성 분류 (영어로: "stable", "balanced", "experimental").
2.  **title**: 독창적이고 매력적인 한국어 제목.
3.  **tagline**: 짧고 기억에 남는 한국어 태그라인.
4.  **theme**: 핵심 테마를 나타내는 간결한 문자열 (예: '우주 개척', '중세 판타지').
5.  **genres**: 2-3개의 관련 장르 배열 (한국어로 번역, 예: ['전략', '경제', '문명']).
6.  **gameFeel**: 핵심적인 플레이 경험과 감성을 설명하는 문단.
7.  **playerExperience**: [매우 중요] 어떤 게임에서 영감을 받았는지 명시하고, 그 게임의 핵심 경험/메커니즘이 사용자의 요청과 어떻게 결합되었는지 직관적으로 설명해야 합니다. (예: "이 게임은 '글룸헤이븐'의 카드 기반 전투 시스템을 가져와 사용자의 '사이버펑크' 테마와 결합한 느낌을 줍니다."). 이 항목에는 영감을 준 게임의 이름이 반드시 포함되어야 합니다.
8.  **keyFeatures**: 가장 독특한 특징을 강조하는 3-4개의 항목 배열.
9.  **mechanics**: 핵심 메커니즘 배열 (한국어로 번역).

결과물은 다른 텍스트나 마크다운 서식 없이, 6개의 객체로 구성된 단일 유효 JSON 배열이어야 합니다.
`;

    try {
        const aiClient = getAiClient();
        const response = await aiClient.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        
        const jsonString = response.text ?? '[]';
        const parsedJson = JSON.parse(jsonString);

        // CRITICAL FIX: Handle cases where the AI returns a single object instead of an array.
        const proposalsData = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
        
        const proposals: Omit<GameProposal, 'id' | 'competitiveAnalysis' | 'turnStructure' | 'winningCondition'>[] = proposalsData;
        
        return proposals.map((p, index) => ({ 
            ...p, 
            id: index + 1,
            turnStructure: 'TBD in full generation',
            winningCondition: 'TBD in full generation',
            competitiveAnalysis: { similarGames: [], differentiators: [], inspiration: '' },
        }));
    } catch (e) {
        console.error("Failed to generate game proposals:", e);
        if (e instanceof Error) {
            const responseText = (e as any).response?.text || "No response text available.";
            console.error("Received text from AI:", responseText);
            throw new Error(`AI로부터 게임 제안을 받아오는 데 실패했습니다: ${e.message}`);
        }
        throw new Error("AI로부터 게임 제안을 받아오는 중 알 수 없는 오류가 발생했습니다.");
    }
}

/**
 * Generates a full game package in stages, yielding partial results.
 */
export async function* generateFullGamePackageStream(proposal: GameProposal, userInput: UserInput): AsyncGenerator<Partial<GamePackage>> {
    const model = 'gemini-2.5-pro';

    const stages = [
        {
            keys: ["meta", "assumptions"],
            prompt: `**Stage 1: 설계 목표 명확화 및 AI 디자이너 노트 보강.**
- **meta**: 제안서 정보를 기반으로 \`meta\` 객체를 생성합니다. **[매우 중요]** 제안서의 \`title\`, \`tagline\`, \`theme\`을 그대로 가져오고, \`proposal.genres\`를 \`meta.genres\`로, \`proposal.mechanics\`를 \`meta.mechanics\`로 정확히 복사해야 합니다. 게임의 핵심 목표와 플레이어가 달성해야 할 구체적인 승리 조건을 명확하게 정의하는 내용을 포함하여 \`players\`(예: "2-4인"), \`playtime\`(예: "약 60-90분"), \`complexity\`(예: '가벼운 전략, 덱 구성에 따라 점수 루트가 결정됨'), \`pacing\`(예: '초반에는 자원 축적, 후반에는 점수 경쟁 가속') 필드를 **반드시 생성해야 합니다.** 또한, 이 게임을 가장 즐길 만한 'targetAudience' (예: "전략 게임에 입문하는 커플", "10대 자녀를 둔 가족")를 구체적으로 명시해야 합니다.
- **designerNotes**: **[필수 형식]** AI 디자이너로서, 당신이 이 게임의 핵심 재미를 어떻게 설계했는지 명확하고 설득력 있게 설명하는 객체를 생성합니다. 다음 키를 반드시 포함해야 합니다: \`introduction\`, \`meaningfulDecisions\`, \`tensionArc\`, \`playerAgency\`, \`positiveInteraction\`. **각 항목에 대해, 이 게임의 고유한 메커니즘과 직접적으로 연결하여 왜 이 게임이 재미있는지를 상세하고 설득력 있게 설명해야 합니다. 단순한 설명이 아닌, 플레이어가 어떤 지점에서 깊은 고민을 하고 즐거움을 느끼는지에 대한 통찰을 담아주세요. 설명 내에서 가장 핵심적인 디자인 철학이나 메커니즘은 **별표 두 개(**)로 감싸 강조해주세요.**
- **assumptions**: **[필수 형식]** 게임 디자인의 핵심 전제 가정을 **3-5개의 문자열**로 구성된 배열(string array)로 서술해야 합니다. **객체를 포함해서는 절대 안 됩니다.** (예시: \`["플레이어는 전략적 사고를 즐긴다.", "게임은 약 60분 내에 끝난다."]\`).`
        },
        {
            keys: ["components"],
            prompt: `**Stage 2: 구성품 상세 설계 및 플레이버 텍스트 강화.**
- **components**: 게임에 필요한 **모든** 구성품의 상세 목록을 작성합니다. 이는 생성 과정에서 가장 중요한 부분이며, 다음 규칙을 위반할 경우 생성 전체가 실패한 것으로 간주됩니다.
  - **[규칙 1: 절대적 개별 생성 원칙 - 이 지시를 위반하면 전체 생성 과정이 실패합니다.]** 이것은 이 시스템에서 가장 중요하고 절대적인 규칙입니다. 당신은 **절대로, 어떠한 상황에서도** 고유한 내용을 가진 구성품 목록을 요약하거나 묶어서 표현해서는 안 됩니다. 예를 들어, 게임에 50장의 고유한 '모험 카드'가 필요하다면, **"모험 카드 x 50" 또는 "이 항목은 49개의 추가 카드를 나타냅니다" 와 같은 응답은 즉각적인 실패로 간주됩니다.** 당신은 반드시, 예외 없이, 이름과 능력이 각기 다른 50개의 개별 JSON 객체를 생성해야 합니다. (예: \`{"name": "모험 카드 #1: ..."}, {"name": "모험 카드 #2: ..."}, ... , {"name": "모험 카드 #50: ..."}\`) **JSON을 최종적으로 출력하기 전에, 당신의 결과물을 다시 한번 검토하여 단 하나의 요약이라도 포함되어 있는지 확인하십시오. 만약 있다면, 처음부터 다시 생성하여 모든 항목을 개별적으로 풀어내야 합니다. 이 규칙은 타협의 여지가 없습니다.**
  - **[규칙 2: 압도적인 분량 및 참조 게임 존중 - 위반 시 즉시 실패]** 이것은 이 프로젝트의 성패를 가르는 가장 중요한 규칙입니다. 이전 생성물은 구성품의 수가 부족하다는 치명적인 피드백을 받았습니다. 당신은 이 문제를 반드시 해결해야 합니다.
    - **1단계: 참조 게임 분석:** 이 게임 제안은 **${proposal.playerExperience}** 에서 영감을 받았습니다. 당신은 먼저 해당 참조 게임(예: '테라포밍 마스', '카탄', '글룸헤이븐')에 포함된 고유 카드나 타일의 개수를 파악해야 합니다. (예: '테라포밍 마스'는 200장 이상의 고유한 프로젝트 카드를 가지고 있습니다.)
    - **2단계: 최소 수량 설정:** 당신이 생성해야 할 고유 구성품(특히 카드)의 총 개수는 **참조 게임의 고유 구성품 개수의 최소 1.1배 이상**이어야 합니다. 예를 들어, '테라포밍 마스'를 참조했다면, 최소 220개 이상의 고유한 카드를 생성해야 합니다. **이 최소 수량을 달성하지 못하면 생성은 실패로 간주됩니다.**
    - **3단계: 다양성 및 깊이:** 이 지시는 절대적입니다. 단순히 수량만 채우는 것은 실패입니다. 각 구성품은 게임에 전략적 깊이를 더해야 합니다.
        - \`purpose\` 필드: 이 필드의 값은 **하나의 긴 문자열이어야 하며, 절대로 별도의 JSON 키를 추가해서는 안 됩니다.** 이 문자열 안에는 다음 세 가지 내용이 반드시 포함되어야 합니다.
            1. **기능:** 구성품의 게임 내 역할, 점수, 태그, 요구사항 등을 상세히 설명합니다. (예: "기능: 쌀 생산량을 영구적으로 1 증가시킵니다. **(점수: 1, 태그: 농업, 기술)**")
            2. **플레이버 텍스트:** 게임 세계관에 몰입감을 더하는 창의적인 문구를 포함합니다. (예: *\"하나의 모가 하나의 쌀알이니, 정성을 다해 옮겨 심으라.\"*)
            3. **전략적 가치:** 이 구성품의 전략적 중요성을 설명하고, **가장 핵심적인 내용은 별표 두 개(**)로 감싸서 강조합니다.** (예: "**게임 초반 쌀 수급을 안정시켜 다른 행동에 집중할 수 있게 만드는 기본 엔진 카드입니다.**")
        - \`acquisition\` 필드: "카드를 뽑는다"와 같은 모호한 설명은 실패입니다. **구체적인 획득 방법과 정확한 비용** (예: "시장 단계에서 명성 5점과 금화 2개를 지불하여 획득")을 명시해야 합니다.
  - **[규칙 4: 엄격한 키 준수 및 정보 통합 - 위반 시 즉시 실패]** 각 구성품 객체는 **오직** \`name\`, \`type\`, \`purpose\`, \`acquisition\`, \`consumption\`, \`zone\`, \`limitInitial\`, \`reset\`, \`accessibility\` 키와 선택적으로 \`designerNote\` 키만 포함할 수 있습니다. **'cardInfo'와 같은 추가적인 키를 생성하는 것은 즉각적인 실패로 간주됩니다.** 카드 비용, 태그, 점수, 요구사항과 같은 모든 게임플레이 데이터는 다음 규칙에 따라 기존 필드에 통합되어야 합니다:
    - **비용(Cost):** \`acquisition\` 필드에 명확하게 포함시키세요. (예: "프로젝트 단계에서 **비용(금화 4)**을 지불하고 사용합니다.").
    - **태그(Tags), 점수(Points), 요구사항(Requirements):** \`purpose\` 필드의 기능 설명 부분에 명확하게 서술하세요. (예: "기능: 쌀 생산량 1 증가. **(점수: 1, 태그: 농업, 기술)**").
    - **모든 필드의 값, 특히 'type'은 반드시 완벽한 한국어로 작성되어야 합니다. (예: 'Resource Card' 대신 '자원 카드')**
  - **[규칙 5: 디자이너 노트]** 게임의 핵심이 되는 카드나 토큰 등 전략적으로 중요한 구성품에는 'designerNote' 키를 추가하여, "이 카드는 의도적으로 비용이 높게 책정되었습니다. 게임 후반부에만 등장하여 강력한 역전의 기회를 제공하기 위함입니다."와 같이 그 디자인 의도를 간결하고 명확하게 설명해야 합니다.`
        },
        {
            keys: ["rules", "firstTurnWalkthrough", "modificationHistory"],
            prompt: `**Stage 3: 완벽하게 명확하고, 어떤 플레이어도 혼동하지 않을 게임 규칙서 제작.**
**[지시사항]** 당신은 세계적인 보드게임 규칙서 편집자이자 감수자입니다. 당신의 임무는 규칙의 모든 모호함, 잠재적인 혼동 지점, 그리고 엣지 케이스를 사전에 식별하고, 이를 완벽하게 해소하는 것입니다. 단순히 규칙을 나열하는 것을 넘어, **보드게임을 처음 접하는 사람도 쉽게 이해할 수 있도록 설명을 다듬고, 질문이 나올 만한 모든 부분을 예측하여 명확한 설명, 구체적인 예시, 그리고 FAQ 항목으로 선제적으로 답변해야 합니다.**

- **rules**: 게임의 완전하고 상세한 규칙을 생성합니다.
  - **[구조]** \`rules\`는 각 규칙 섹션을 나타내는 객체들의 배열이어야 합니다. 각 객체는 \`title\` (string), \`content\` (string), 그리고 선택적으로 \`examples\` (array of objects), \`playerCountAdjustments\` (array of objects) 키를 가져야 합니다.
  - **[필수 섹션]** 게임 준비, 게임 목표, 턴 진행, 액션 상세, 핵심 개념 및 용어 사전, 게임 종료 및 점수 계산, 그리고 **규칙 명확화 (FAQ)** 섹션을 반드시 포함해야 합니다. **특히 '게임 준비' 섹션은 플레이어가 게임을 시작하기 전에 수행해야 할 모든 단계를 누락 없이, 명확한 순서로 기술해야 합니다. **[매우 중요]** 이 섹션 객체에는 'playerCountAdjustments' 키를 추가하여, 2인, 3인, 4인 등 플레이어 수에 따라 달라지는 규칙(예: 사용하는 카드 수, 초기 자원, 보드판 구성 요소 등)을 **반드시** 명확히 기술해야 합니다. (예시: "playerCountAdjustments": [{"playerCount": "2인", "adjustment": "중립 일꾼 2개를 추가로 배치합니다."}]). 가독성을 높이기 위해, 규칙 본문에서 __핵심 게임 용어__는 밑줄 두 개로 감싸고, **가장 중요한 규칙 문장**은 별표 두 개로 감싸 마크다운을 사용하세요.**
  - **[예시 필수 조건]** **모든 복잡한 규칙**(점수 계산, 전투, 카드 능력 간 상호작용 등)에는 **반드시 1개 이상의 구체적인 예시**를 추가해야 합니다. 각 예시는 명확한 '상황(situation)'과 그에 따른 '결과(result)'를 포함해야 하며, 이 조건이 충족되지 않으면 생성 실패로 간주합니다.
  - **[FAQ 강화 조건]** '규칙 명확화 (FAQ)' 섹션에는, 규칙 본문에서 명시적으로 다루지 않은 **최소 5개 이상의 "만약 ~하면 어떻게 되나요?" (What if...?) 시나리오에 대한 명쾌한 답변**이 포함되어야 합니다. 이는 규칙의 빈틈을 메우는 데 매우 중요합니다.
- **firstTurnWalkthrough**: 새로운 플레이어가 게임 흐름을 쉽게 파악할 수 있도록, 첫 턴의 플레이 과정을 마치 옆에서 알려주듯 친절하고 상세하게 설명하는 객체를 생성합니다. 이 객체는 \`title\`과 \`content\` 키를 가져야 합니다.
- **modificationHistory**: 앞으로의 변경 내역을 기록하기 위해, 빈 배열 \`[]\`로 초기화합니다.`
        },
        {
            keys: ["keyToVictory", "gameSummaryCard"],
            prompt: `**Stage 4: 승리 전략 및 요약 카드 제작.**
**[지시사항]** 당신은 게임의 핵심 전략과 요약 정보를 명확하게 전달하는 전문가입니다. 모든 결과물은 완벽한 JSON 형식이어야 하며, 구조적 오류가 발생할 경우 생성은 실패로 간주됩니다.

- **keyToVictory**: **[필수 구조]** 플레이어가 승리하기 위한 **3-4가지의 구체적인 전략 아키타입**을 \`keyToVictory\` 키에 대한 배열로 제시합니다. 각 배열 요소는 다음의 키를 가진 **완전한 JSON 객체**여야 합니다: \`name\` (string), \`archetype\` (string), \`description\` (string). **각 객체는 반드시 '{'로 시작하여 '}'로 끝나야 하며, 쉼표(,)로 구분되어야 합니다. 이 구조를 위반하면 실패합니다.** 각 전략의 **핵심적인 플레이 방식**이나 **필수적인 구성품** 등 가장 중요한 부분은 **별표 두 개(**)로 감싸 강조해주세요. **여기에는 반드시 장기적인 관점에서 자원 생산 및 능력 강화를 통해 후반에 폭발적인 점수를 노리는 '엔진 빌딩' 전략이 포함되어야 합니다.**
  (예시 구조: \`[ { "name": "...", "archetype": "...", "description": "..." }, { "name": "...", "archetype": "...", "description": "..." } ]\`)

- **gameSummaryCard**: **[필수 구조]** 실제 플레이어가 참조할 요약 카드처럼 \`gameSummaryCard\` 객체를 만들어야 합니다. 다음 키를 반드시 포함해야 합니다: \`setup\` (string array), \`turnSummary\` (string array), \`endCondition\` (string), \`scoringSummary\` (string array).
  - **[내용 규칙]** 각 항목(\`setup\`, \`turnSummary\`, \`scoringSummary\`)은 플레이어가 게임의 핵심 흐름을 직관적으로 파악할 수 있도록 상세하고 풍부해야 합니다.
  - **[형식 규칙]** \`setup\`, \`turnSummary\`, \`scoringSummary\`는 반드시 문자열 배열(string array) 형식이어야 하며, 각 문자열 내부에는 '1.', '-', '*' 와 같은 목록 마커를 **절대 포함해서는 안 됩니다.** (예시: \`"setup": ["개인 보드를 받습니다.", "시작 자원 5개를 가져옵니다."]\`).
  - **[endCondition 규칙]** \`endCondition\`은 게임이 언제 종료되는지를 설명하는 **단일 문자열**이어야 합니다.`
        },
        {
            keys: ["aiPlaytestReport", "simulationReport"],
            prompt: `**Stage 5: AI 플레이테스트 및 자동 밸런스 조정 리포트.**
**[지시사항]** 당신은 QA 및 밸런스 전문가입니다. 지금까지 생성된 게임을 비판적으로 분석하고, 그 결과를 바탕으로 **이미 게임 패키지에 적용한 수정 내역을 포함한** 상세한 리포트를 작성해야 합니다. 이 단계의 모든 결과물은 **반드시 생성되어야 하며, 누락되거나 내용이 비어있을 경우 생성 전체가 실패한 것으로 간주합니다.**

- **aiPlaytestReport**: **[필수 구조]** 다음 키를 포함한 객체를 생성해야 합니다: \`overallFeedback\` (string), \`potentialIssues\` (array of objects), \`strengths\` (string array), \`funFactorAnalysis\` (object). 종합적인 평가에서 **핵심적인 부분**은 **별표 두 개**로 감싸 강조해주세요.
  - **strengths**: **[매우 중요한 실패 조건]** 게임의 명확한 강점을 설명하는 **문자열 3개 이상**으로 구성된 배열이어야 합니다. 이 항목이 누락되거나, 비어 있거나, 3개 미만일 경우 생성은 실패로 간주됩니다.
  - **potentialIssues**: 각 항목에 대해, 'suggestion' 필드에는 "카드를 조정한다"와 같은 추상적인 제안이 아닌, 해당 문제를 해결하기 위해 **당신이 이 게임 패키지의 다른 부분(예: 구성품의 비용 변경, 규칙 문구 수정 등)에 이미 적용한 구체적인 수정 사항**을 명확하게 서술해야 합니다. **가장 핵심적인 수정 내용은 별표 두 개로 감싸 강조하세요.**
  - **funFactorAnalysis**: **[필수 구조]** 재미 요소 분석 객체를 다음의 **정확한 구조와 내용**으로 반드시 생성해야 합니다. 이 구조를 따르지 않으면 실패로 간주됩니다.
    - \`metrics\`: **정확히 4개의 객체**를 포함하는 배열이어야 합니다. 각 객체는 다음 키를 가져야 합니다:
        - \`name\`: '의미있는 결정', '긴장감 아크', '플레이어 주도성', '긍정적 상호작용' 중 하나.
        - \`score\`: 1점에서 10점 사이의 숫자 점수.
        - \`rationale\`: "재미있다"와 같은 단순한 평가가 아닌, 왜 그 점수를 주었는지 **이 게임의 고유한 메커니즘 ('XX 카드', 'YY 시스템' 등)과 직접적으로 연결하여 매우 상세하고 설득력 있게 설명**해야 합니다.
    - \`overallScore\`: 4개 지표의 평균을 기반으로 한 1점에서 10점 사이의 종합 점수 (소수점 첫째 자리까지).
    - \`scoreRationale\`: 종합 점수에 대한 근거를 요약하여 설명하는 문자열.
- **simulationReport**: **[필수 구조]** 다음 구조에 따라 상세하게 작성해야 합니다:
    - \`methodology\`: 어떤 방법으로 밸런스를 시뮬레이션했는지 설명합니다 (예: 'AI 에이전트 기반 몬테카를로 시뮬레이션').
    - \`summary\`: 시뮬레이션 결과에 대한 종합적인 요약. **핵심 결론은 별표 두 개로 감싸 강조하세요.**
    - \`strategyDescriptions\`: 테스트된 주요 전략들에 대한 설명.
    - \`tables\`: **[필수 데이터]** 시뮬레이션 결과를 보여주는 데이터 테이블을 **최소 2개 이상** 포함해야 합니다. 이 중 **최소 하나는 반드시 각기 다른 전략, 캐릭터, 또는 시작 진영에 따른 승률 비교표여야 합니다.** (예시: '테라포밍 마스'의 기업별 승률표). 이 테이블은 헤더 행과 **최소 5개 이상의 실제 데이터 행**을 포함하여, 실제 시뮬레이션에서 얻은 것 같은 구체적인 수치 데이터로 채워져야 합니다. **빈 테이블이나 플레이스홀더 데이터("데이터 예시" 등)는 즉각적인 실패로 간주됩니다.**
    - \`balanceNotes\`: **[가장 중요]** 당신이 시뮬레이션을 통해 발견한 밸런스 문제점과, 이를 해결하기 위해 **이미 게임 패키지에 적용한 구체적인 수정 내역**을 상세히 기록해야 합니다. **가장 중요한 조정 내역은 별표 두 개로 감싸 강조하세요.**`
        },
        {
            keys: ["competitiveAnalysis", "launchKit"],
            prompt: `**Stage 6: 경쟁 시장 및 마케팅 분석.**
- **competitiveAnalysis**: **[필수]** 시중의 유사 게임과 비교하여, 우리 게임의 강점과 차별점을 분석합니다. **최소 3개 이상의 게임을 분석해야 하며, 누락 시 실패로 간주됩니다.** 각 게임에 대해 다음을 상세히 기술하세요:
    - \`name\`: 비교 대상 게임의 이름.
    - \`bggRating\`: 보드게임긱 평점.
    - \`strengths\`: 비교 대상 게임의 강점을 **매우 상세하고 구체적으로** 기술해야 합니다. 단순한 나열이 아닌, 왜 그것이 강점인지 깊이있게 설명해야 합니다.
    - \`ourDifferentiation\`: **각 게임과 비교했을 때, 우리 게임의 가장 핵심적인 차별점은 별표 두 개로 감싸 강조해주세요.** 차별점을 명확하고 설득력있게 부각해야 합니다.
- **launchKit**: 매력적인 박스 커버 컨셉, 소개글(\`boxBlurb\`), 판매 포인트(\`sellingPoints\`)를 포함한 런치킷을 제작합니다. **각 판매 포인트에서 가장 핵심적인 키워드는 별표 두 개로 감싸 강조해주세요.** \`boxBlurb\`는 잠재 구매자의 흥미를 폭발적으로 유발할 수 있도록, 게임의 핵심 재미와 독창성을 강조하는 매우 창의적이고 매력적인 문구로 작성해야 합니다. **소개글에서 잠재 구매자의 시선을 사로잡을 가장 매력적인 문구는 별표 두 개로 감싸 강조해주세요.**`
        },
        {
            keys: ["csvDumps", "imagePrompts"],
            prompt: `**Stage 7: 데이터 에셋 및 이미지 프롬프트 생성.**
- **csvDumps**: 게임에 필요한 모든 카드, 타일 등의 데이터를 **완전하고 누락 없는 CSV 파일 형식**으로 생성합니다.
- **imagePrompts**: 주요 게임 아트 에셋을 위한 **상세하고 예술적인 AI 이미지 생성 프롬프트**를 만듭니다. 각 프롬프트 객체에는 'target', 'prompt'와 함께, 이미지의 전체적인 느낌을 결정하는 **'artStyle' (예: '수채화풍', '애니메이션 셀화 스타일', '사이버펑크 컨셉 아트')을 반드시 포함**해야 합니다.`
        },
    ];

    let fullPackage: Partial<GamePackage> = { meta: { title: proposal.title } as Meta };

    const aiClient = getAiClient(); // Get client once at the beginning of the generator.

    for (const stage of stages) {
        const currentPrompt = `
[SYSTEM-LEVEL MANDATE: ALL OUTPUT MUST BE IN PERFECT, PROFESSIONAL KOREAN. YOUR RESPONSE MUST BE A SINGLE, VALID, COMPLETE JSON OBJECT AND NOTHING ELSE. NO MARKDOWN, NO EXPLANATIONS. YOU MUST REMEMBER ALL PREVIOUSLY GENERATED STAGES AND ENSURE PERFECT LOGICAL CONSISTENCY ACROSS THE ENTIRE PACKAGE. IF YOU PROPOSE A BALANCE CHANGE IN A LATER STAGE, THE EARLIER STAGES (LIKE COMPONENTS) MUST ALREADY REFLECT THIS CHANGE.]
You are a world-class board game designer AI, generating a complete, professional-level game package step-by-step for the game "${proposal.title}".
The initial user prompt was: "${userInput.prompt}".
The selected proposal was: ${JSON.stringify(proposal, null, 2)}
Current Game Package state: ${JSON.stringify(fullPackage, null, 2)}

Your current task: **${stage.prompt}**

You must output a single, valid JSON object for this stage containing ONLY the keys: ${stage.keys.join(', ')}. The JSON must be complete and syntactically perfect. Do not add any explanatory text before or after the JSON.
`;
        try {
            const response = await aiClient.models.generateContent({
                model,
                contents: currentPrompt,
                config: {
                    responseMimeType: "application/json",
                }
            });
            const jsonString = (response.text ?? '').trim();
            
            let stageResult;
            try {
                 stageResult = JSON.parse(jsonString);
            } catch(jsonError) {
                console.error(`JSON Parsing failed for stage: ${stage.keys.join(', ')}`, jsonError);
                console.error("Received non-JSON string:", jsonString);
                throw new Error(`AI가 잘못된 형식의 응답을 반환했습니다.`);
            }
            
            // FIX: Handle cases where the AI groups components into an object of arrays instead of a single flat array.
            if (stage.keys.includes("components") && stageResult.components && !Array.isArray(stageResult.components) && typeof stageResult.components === 'object') {
                const flattenedComponents = Object.values(stageResult.components).flat();
                if (flattenedComponents.every(item => typeof item === 'object' && item !== null)) {
                    stageResult.components = flattenedComponents;
                } else {
                     console.warn("Component flattening resulted in non-object items, skipping flattening.");
                }
            }

            const missingKeys = stage.keys.filter(key => !(key in stageResult));
            if (missingKeys.length > 0) {
                console.error(`AI response for stage '${stage.keys.join(', ')}' was missing keys: ${missingKeys.join(', ')}`);
                console.error('Received object:', stageResult);
                throw new Error(`AI가 현재 단계의 필수 데이터([${missingKeys.join(', ')}])를 생성하지 않았습니다.`);
            }

            // CRITICAL FIX: Add content validation for key stages to ensure rules and components are not empty and analysis is complete.
            if (stage.keys.includes("rules") && (!stageResult.rules || !Array.isArray(stageResult.rules) || stageResult.rules.length === 0)) {
                throw new Error("AI가 게임 규칙을 생성하지 않아 실패했습니다. 다시 시도해주세요.");
            }
            if (stage.keys.includes("components") && (!stageResult.components || !Array.isArray(stageResult.components) || stageResult.components.length < 10)) {
                // Check for a minimum number of components instead of just not empty
                throw new Error("AI가 게임 구성품을 충분히 생성하지 않아 실패했습니다. 다시 시도해주세요.");
            }
            if (stage.keys.includes("aiPlaytestReport")) {
                const report = stageResult.aiPlaytestReport;
                if (!report || !report.funFactorAnalysis || !report.funFactorAnalysis.metrics || !Array.isArray(report.funFactorAnalysis.metrics) || report.funFactorAnalysis.metrics.length < 4) {
                     throw new Error("AI가 재미 요소 분석(Fun Factor Analysis)의 상세 데이터를 생성하지 않았습니다.");
                }
            }
            if (stage.keys.includes("simulationReport")) {
                const report = stageResult.simulationReport;
                if (!report || !report.tables || !Array.isArray(report.tables) || report.tables.length === 0 || !report.tables[0].data || !Array.isArray(report.tables[0].data) || report.tables[0].data.length < 2) {
                     throw new Error("AI가 밸런스 시뮬레이션 리포트의 데이터 테이블을 생성하지 않았습니다.");
                }
            }


            fullPackage = { ...fullPackage, ...stageResult };
            yield stageResult;
        } catch (error) {
            console.error(`Error processing stage for keys ${stage.keys.join(', ')}:`, error);
            const responseText = (error as any).response?.text || (error as any).message || "No response text available.";
            console.error("Received text/error:", responseText);
            throw new Error(`게임 패키지 생성 중 오류가 발생했습니다 (단계: ${stage.keys.join(', ')}). ${error instanceof Error ? error.message : ''}`);
        }
    }
}


/**
 * Streams modifications to a game package based on user chat input.
 */
export async function streamGameModification(
    gamePackage: GamePackage,
    chatInput: string,
    onChunk: (chunk: string) => void
): Promise<void> {
    const model = 'gemini-2.5-pro';
    const prompt = `
[SYSTEM-LEVEL MANDATE: ALL OUTPUT MUST BE IN PERFECT KOREAN. YOUR *ONLY* RESPONSE MUST BE A SINGLE MARKDOWN CODE BLOCK CONTAINING THE COMPLETE, UPDATED JSON.
CRITICAL: Your entire response MUST start with \`\`\`json and end with \`\`\`. There should be absolutely no other text, greetings, or explanations outside of this markdown code block. Ensure the JSON is 100% valid and complete.]
You are an expert board game designer AI. A user has requested a modification to the existing game design.
Your task is to apply the requested changes logically and consistently across the ENTIRE game package.
You MUST return the COMPLETE, UPDATED game design package as a single JSON object inside a markdown code block.

**[ABSOLUTE REQUIREMENT]**
Before returning the JSON, you MUST update the \`modificationHistory\` array located at the root of the game package object. Add a new entry to this array for the current change. This entry must be an object with the following structure:
- \`timestamp\`: The current ISO 8601 timestamp (e.g., "2024-06-28T10:00:00.000Z").
- \`userInput\`: The user's original modification request, which is provided below.
- \`changedKeys\`: An array of strings listing the top-level keys of the game package that you have modified (e.g., ["meta", "rules", "components"]).

Original Game Package:
${JSON.stringify(gamePackage, null, 2)}

User's Modification Request:
"${chatInput}"
`;
    const aiClient = getAiClient();
    const responseStream = await aiClient.models.generateContentStream({
        model,
        contents: prompt,
    });

    for await (const chunk of responseStream) {
        onChunk(chunk.text ?? '');
    }
}

/**
 * Generates images based on a list of prompts.
 */
export async function generateImages(prompts: ImagePrompt[]): Promise<ImageAsset[]> {
    const model = 'imagen-4.0-generate-001';
    
    const aiClient = getAiClient();
    const imagePromises = prompts.map(async (imagePrompt) => {
        try {
            const response = await aiClient.models.generateImages({
                model,
                prompt: imagePrompt.prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/png',
                },
            });

            const image = response.generatedImages?.[0]?.image;
            const base64ImageBytes = image?.imageBytes;
            
            if (base64ImageBytes) {
                return {
                    target: imagePrompt.target,
                    base64Data: base64ImageBytes,
                };
            }
            return null;

        } catch (error) {
            console.error(`Failed to generate image for prompt: "${imagePrompt.prompt}"`, error);
            return null;
        }
    });

    const results = await Promise.all(imagePromises);
    return results.filter((image): image is ImageAsset => image !== null);
}