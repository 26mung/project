// AI 기획 분석 서비스
// OpenAI 호환 API를 사용하여 기획안을 분석하고 요건을 생성합니다.

export interface AIAnalysisResult {
  requirements: {
    title: string;
    description: string;
    requirement_type: 'functional' | 'non_functional' | 'constraint';
    priority: 'low' | 'medium' | 'high' | 'critical';
    questions: {
      question_text: string;
      question_type: 'open' | 'choice' | 'boolean';
      options?: string[];
    }[];
  }[];
}

export interface PRDGenerationResult {
  content: string;
}

/**
 * OpenAI 호환 API를 사용하여 채팅 완료
 */
async function chatCompletion(
  messages: { role: string; content: string }[],
  apiKey: string,
  baseURL: string
): Promise<string> {
  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5',
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 상위 기획안을 분석하여 세부 요건을 도출
 */
export async function analyzeProjectRequirements(
  inputContent: string,
  apiKey: string,
  baseURL: string
): Promise<AIAnalysisResult> {
  const systemPrompt = `당신은 전문 기획자(Product Manager)입니다. 
상위 기획안을 분석하여 구현에 필요한 세부 기능 요건들을 도출하고, 
각 요건을 확인하기 위한 질문들을 생성합니다.

응답은 반드시 다음 JSON 형식으로 제공해야 합니다:
{
  "requirements": [
    {
      "title": "요건 제목",
      "description": "요건 상세 설명",
      "requirement_type": "functional|non_functional|constraint",
      "priority": "low|medium|high|critical",
      "questions": [
        {
          "question_text": "확인이 필요한 질문",
          "question_type": "open|choice|boolean",
          "options": ["선택지1", "선택지2"] // choice 타입인 경우에만
        }
      ]
    }
  ]
}`;

  const userPrompt = `다음 상위 기획안을 분석하여 세부 요건들을 도출해주세요:

${inputContent}

요구사항:
1. 기능적 요건(functional), 비기능적 요건(non_functional), 제약사항(constraint)으로 분류
2. 각 요건의 우선순위를 설정 (critical > high > medium > low)
3. 각 요건마다 구체화에 필요한 질문 2-4개를 생성
4. 질문 유형은 개방형(open), 선택형(choice), 예/아니오(boolean) 중 선택
5. JSON 형식으로만 응답`;

  const content = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    apiKey,
    baseURL
  );

  // JSON 추출 (마크다운 코드 블록 제거)
  let jsonContent = content.trim();
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.replace(/```\n?/g, '');
  }

  return JSON.parse(jsonContent);
}

/**
 * 답변을 기반으로 추가 파생 질문 생성
 */
export async function generateFollowUpQuestions(
  requirementTitle: string,
  questionText: string,
  answerText: string,
  apiKey: string,
  baseURL: string
): Promise<{ question_text: string; question_type: string }[]> {
  const systemPrompt = `당신은 전문 기획자입니다. 
사용자의 답변을 분석하여 더 구체적인 정보가 필요한 경우 추가 질문을 생성합니다.

응답은 반드시 다음 JSON 형식으로 제공해야 합니다:
{
  "questions": [
    {
      "question_text": "추가 질문 내용",
      "question_type": "open|choice|boolean"
    }
  ]
}

추가 질문이 필요 없다면 빈 배열을 반환하세요: {"questions": []}`;

  const userPrompt = `요건: ${requirementTitle}
질문: ${questionText}
답변: ${answerText}

위 답변을 바탕으로 더 구체적인 정보를 얻기 위한 추가 질문이 필요한지 판단하고, 
필요하다면 1-3개의 추가 질문을 생성해주세요. JSON 형식으로만 응답하세요.`;

  const content = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    apiKey,
    baseURL
  );

  let jsonContent = content.trim();
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.replace(/```\n?/g, '');
  }

  const result = JSON.parse(jsonContent);
  return result.questions || [];
}

/**
 * 프로젝트 정보와 모든 요건/답변을 기반으로 PRD 문서 생성
 */
export async function generatePRD(
  projectTitle: string,
  projectDescription: string,
  requirementsData: {
    title: string;
    description: string;
    questions: { question: string; answer: string }[];
  }[],
  apiKey: string,
  baseURL: string
): Promise<PRDGenerationResult> {
  const systemPrompt = `당신은 전문 기획자(Product Manager)입니다. 
수집된 모든 정보를 바탕으로 완전하고 구조화된 PRD(Product Requirements Document)를 작성합니다.

PRD는 다음 섹션을 포함해야 합니다:
1. 개요 (프로젝트 목적, 배경)
2. 핵심 가치 (해결하려는 문제, 사용자 니즈)
3. 목표 사용자
4. 기능 명세
5. 비기능 요건
6. 제약사항
7. 일정 및 마일스톤 제안

Markdown 형식으로 작성하세요.`;

  const requirementsText = requirementsData
    .map(
      (req) => `
### ${req.title}
${req.description}

**확인된 정보:**
${req.questions.map((q) => `- ${q.question}: ${q.answer}`).join('\n')}
`
    )
    .join('\n');

  const userPrompt = `프로젝트: ${projectTitle}
설명: ${projectDescription}

세부 요건 정보:
${requirementsText}

위 정보를 바탕으로 완전한 PRD 문서를 작성해주세요.`;

  const content = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    apiKey,
    baseURL
  );

  return { content };
}
