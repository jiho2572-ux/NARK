import { GoogleGenAI, Type } from "@google/genai";
import type {
    UserInput,
    GameProposal,
    GamePackage,
} from '../types';

// Fix: Per guidelines, initialize with a named parameter object.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a random one-sentence board game idea.
 */
export const generateRandomPrompt = async (): Promise<string> => {
    try {
        // Fix: Per guidelines, use gemini-2.5-flash for basic text tasks.
        const model = 'gemini-2.5-flash';
        const response = await ai.models.generateContent({
            model,
            contents: '독특하고 창의적인 보드게임 아이디어 한 문장만 생성해줘. 예: \'고양이들이 운영하는 마법 약초 가게\'',
            config: {
                temperature: 1.0,
            }
        });
        // Fix: Per guidelines, access text directly from response.text
        return response.text.trim();
    } catch (error) {
        console.error("Error generating random prompt:", error);
        // Provide a fallback prompt on error
        return '시간 여행을 하는 탐정들이 역사 속 미제 사건을 해결하는 게임';
    }
};

/**
 * Generates 6 game proposals based on user input, with varying creativity levels.
 */
export const generateGameProposals = async (userInput: UserInput): Promise<GameProposal[]> => {
    // Fix: Per guidelines, use gemini-2.5-pro for complex text/JSON tasks.
    const model = 'gemini-2.5-pro';

    const prompt = `사용자의 다음 보드게임 아이디어를 기반으로 총 6개의 게임 컨셉 제안을 생성해줘: "${userInput.prompt}"

  각 제안은 다음 세 가지 창의성 수준 중 하나에 속해야 해:
  1.  **안정형 (Stable)**: 사용자의 요청을 충실하게 해석하여 완성도를 높인 컨셉 (2개 생성)
  2.  **균형형 (Balanced)**: 핵심 아이디어에 새로운 메커니즘이나 테마를 더해 독창성을 가미한 컨셉 (2개 생성)
  3.  **실험형 (Experimental)**: 아이디어에서 영감을 받아, 매우 혁신적이고 예상치 못한 방향으로 재해석한 컨셉 (2개 생성)

  각 제안은 아래 JSON 스키마를 엄격히 따라야 하며, 모든 필드를 채워야 해. 특히 'creativitySource' 필드에 'stable', 'balanced', 'experimental' 중 하나를 명시해야 해. ID는 0부터 5까지 순서대로 부여해줘.`;

    const proposalSchema = {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.NUMBER, description: "0부터 5까지의 고유 ID" },
            title: { type: Type.STRING, description: "게임의 제목" },
            tagline: { type: Type.STRING, description: "게임을 한 문장으로 요약하는 매력적인 태그라인" },
            gameFeel: { type: Type.STRING, description: "플레이어가 게임을 하면서 느끼게 될 전반적인 감각이나 분위기 (예: 전략적, 긴장감 넘치는, 파티 분위기의)" },
            playerExperience: { type: Type.STRING, description: "플레이어가 이 게임을 통해 경험하게 될 핵심 재미 요소에 대한 설명" },
            keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING }, description: "게임의 가장 중요한 특징 3가지" },
            turnStructure: { type: Type.STRING, description: "플레이어의 턴이 어떻게 진행되는지에 대한 간략한 설명" },
            winningCondition: { type: Type.STRING, description: "게임에서 승리하기 위한 조건" },
            genres: { type: Type.ARRAY, items: { type: Type.STRING }, description: "게임의 장르 (예: 전략, 테마, 가족)" },
            theme: { type: Type.STRING, description: "게임의 테마 (예: 판타지, SF, 역사)" },
            mechanics: { type: Type.ARRAY, items: { type: Type.STRING }, description: "게임의 핵심 메커니즘 (예: 덱 빌딩, 일꾼 놓기)" },
            competitiveAnalysis: {
                type: Type.OBJECT,
                properties: {
                    similarGames: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: { name: { type: Type.STRING }, reason: { type: Type.STRING } },
                            required: ['name', 'reason']
                        },
                        description: "이 게임과 유사한 기존 보드게임 1-2개와 그 이유"
                    },
                    differentiators: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "유사 게임들과 비교했을 때 이 게임만의 차별점 2가지"
                    },
                    inspiration: { type: Type.STRING, description: "이 컨셉에 영감을 준 요소(게임, 영화, 책 등)" }
                },
                required: ['similarGames', 'differentiators', 'inspiration']
            },
            creativitySource: { type: Type.STRING, enum: ['stable', 'balanced', 'experimental'], description: "창의성 수준" }
        },
        required: ['id', 'title', 'tagline', 'gameFeel', 'playerExperience', 'keyFeatures', 'turnStructure', 'winningCondition', 'genres', 'theme', 'mechanics', 'competitiveAnalysis', 'creativitySource']
    };

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            proposals: {
                type: Type.ARRAY,
                items: proposalSchema
            }
        },
        required: ['proposals']
    };

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            temperature: 0.8,
        },
    });

    try {
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        return parsed.proposals || [];
    } catch (e) {
        console.error("Failed to parse proposals JSON:", e, "Raw response:", response.text);
        return [];
    }
};

/**
 * Generates a full game package in a stage-by-stage stream.
 */
export async function* generateFullGamePackageStream(proposal: GameProposal, userInput: UserInput): AsyncGenerator<Partial<GamePackage>> {
    const model = 'gemini-2.5-pro';

    const initialContext = `
      사용자 초기 프롬프트: "${userInput.prompt}"
      선택된 게임 제안:
      - 제목: ${proposal.title}
      - 태그라인: ${proposal.tagline}
      - 플레이어 경험: ${proposal.playerExperience}
      - 핵심 특징: ${proposal.keyFeatures.join(', ')}
      - 장르: ${proposal.genres.join(', ')}
      - 테마: ${proposal.theme}
      - 메커니즘: ${proposal.mechanics.join(', ')}
      
      이 정보를 바탕으로 아래 요청에 따라 상세한 보드게임 디자인 문서를 단계별로 생성해줘. 각 단계는 요청한 JSON 스키마에 따라 독립적인 JSON 객체로 응답해야 해.
      모든 내용은 한국어로 작성해줘.
    `;
    
    // This is a simplified approach. In a real scenario, schemas would be more complex
    // and imported from a shared location to stay in sync with the types.
    const schemas: { [key: string]: any } = {
        meta: { type: Type.OBJECT, properties: { meta: { type: Type.OBJECT }, assumptions: { type: Type.ARRAY, items: { type: Type.STRING } } } },
        components: { type: Type.OBJECT, properties: { components: { type: Type.ARRAY, items: { type: Type.OBJECT } } } },
        rules: { type: Type.OBJECT, properties: { rules: { type: Type.ARRAY, items: { type: Type.OBJECT } }, firstTurnWalkthrough: { type: Type.OBJECT } } },
        victory: { type: Type.OBJECT, properties: { keyToVictory: { type: Type.ARRAY, items: { type: Type.OBJECT } }, gameSummaryCard: { type: Type.OBJECT } } },
        analysis: { type: Type.OBJECT, properties: { aiPlaytestReport: { type: Type.OBJECT }, simulationReport: { type: Type.OBJECT } } },
        market: { type: Type.OBJECT, properties: { competitiveAnalysis: { type: Type.ARRAY, items: { type: Type.OBJECT } }, launchKit: { type: Type.OBJECT } } },
        assets: { type: Type.OBJECT, properties: { imagePrompts: { type: Type.ARRAY, items: { type: Type.OBJECT } }, csvDumps: { type: Type.ARRAY, items: { type: Type.OBJECT } } } },
    };

    const stages = [
        { key: 'meta', prompt: "[1단계] 게임의 메타 데이터와 핵심 설계 가정을 생성해줘. 'designerNotes'에는 게임의 핵심 재미 포인트를 어떻게 설계했는지 상세히 서술해줘." },
        { key: 'components', prompt: "[2단계] 게임에 필요한 모든 구성품(카드, 보드, 토큰 등)의 상세 목록을 생성해줘. 각 구성품의 이름, 타입, 목적, 획득/소모 방법 등을 포함해줘." },
        { key: 'rules', prompt: "[3단계] 게임의 핵심 규칙과 첫 턴 예시 플레이(First Turn Walkthrough)를 생성해줘. 규칙은 이해하기 쉽게 섹션별로 나누고, 필요한 경우 예시를 포함해줘." },
        { key: 'victory', prompt: "[4단계] 플레이어가 승리하기 위한 다양한 전략(Key to Victory)과, 게임의 흐름을 요약한 카드(Game Summary Card)를 생성해줘." },
        { key: 'analysis', prompt: "[5단계] 가상의 AI 플레이테스트를 진행하고, 그 결과를 바탕으로 리포트를 작성해줘. 종합 평가, 강점, 잠재적 이슈, 재미 요소 분석(Fun Factor Analysis)을 포함해야 해. 또한, 주요 전략들의 승률을 시뮬레이션하고 밸런스에 대한 노트를 포함한 리포트도 생성해줘." },
        { key: 'market', prompt: "[6단계] 이 게임과 유사한 기존 게임들과의 경쟁 분석 자료와, 게임 출시를 위한 런치킷(박스 문구, 핵심 판매 포인트, SNS 홍보 포스트)을 생성해줘." },
        { key: 'assets', prompt: "[7단계] 게임의 주요 구성물에 대한 이미지 생성 프롬프트와, 게임 데이터 관리에 유용한 CSV 파일(예: 카드 목록) 초안을 생성해줘. modificationHistory는 첫 생성 기록을 남겨줘." },
    ];

    let fullPackage: Partial<GamePackage> = {};

    for (const stage of stages) {
        const prompt = `${initialContext}\n\n현재까지 디자인된 내용:\n${JSON.stringify(fullPackage, null, 2)}\n\n${stage.prompt}`;
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schemas[stage.key],
                temperature: 0.5,
            },
        });

        try {
            const jsonText = response.text.trim();
            const result = JSON.parse(jsonText) as Partial<GamePackage>;

            // Add initial modification history on the last step
            if (stage.key === 'assets') {
                result.modificationHistory = [{
                    timestamp: new Date().toISOString(),
                    userInput: "Initial generation",
                    changedKeys: Object.keys(fullPackage).concat(Object.keys(result))
                }];
            }
            
            fullPackage = { ...fullPackage, ...result };
            yield result;
        } catch (e) {
            console.error(`Error processing stage '${stage.key}':`, e, "Raw response:", response.text);
            throw new Error(`'${stage.key}' 단계 생성에 실패했습니다.`);
        }
    }
}


/**
 * Streams modifications to a game package based on user input.
 * Responds with conversational text first, then a JSON object of the full, modified package.
 */
export const streamGameModification = async (
    gamePackage: GamePackage,
    userInput: string,
    onChunk: (chunk: string) => void
): Promise<void> => {
    const model = 'gemini-2.5-pro';

    // Remove potentially large/unnecessary fields from the context to save tokens
    const contextPackage = { ...gamePackage };
    delete contextPackage.images;
    delete contextPackage.csvDumps;

    const prompt = `
        현재 보드게임 디자인은 다음과 같아:
        \`\`\`json
        ${JSON.stringify(contextPackage, null, 2)}
        \`\`\`

        사용자가 다음 수정을 요청했어: "${userInput}"

        요청을 분석하고, 그에 따라 게임 디자인 전체를 수정해줘. 수정은 논리적으로 일관되어야 하며, 한 부분의 변경이 다른 부분에 미치는 영향을 고려해야 해.
        
        응답은 다음 형식으로 제공해줘:
        1.  (JSON 코드 블록 외부) 사용자의 요청을 어떻게 이해했고, 어떤 변경을 할 것인지에 대한 친절하고 상세한 설명.
        2.  (JSON 코드 블록 내부) 설명 후, 반드시 \`\`\`json ... \`\`\` 코드 블록 안에 수정된 **전체** 게임 패키지 JSON 객체를 포함해줘.
        
        JSON 객체는 기존 구조를 완벽하게 유지해야 하며, 모든 필드가 포함되어야 해. 
        'modificationHistory' 배열의 맨 끝에 이번 변경사항에 대한 기록을 새로 추가해줘. 
        이번 요청으로 인해 변경된 최상위 키(예: 'meta', 'rules', 'components')를 'changedKeys' 배열에 정확히 명시해줘.
    `;

    const responseStream = await ai.models.generateContentStream({
        model,
        contents: prompt,
        config: {
            temperature: 0.5
        }
    });

    for await (const chunk of responseStream) {
        // Fix: Per guidelines, access text directly from chunk.text
        onChunk(chunk.text);
    }
};
