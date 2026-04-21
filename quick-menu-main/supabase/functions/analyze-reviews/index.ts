import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { reviews } = await req.json()

    if (!reviews || typeof reviews !== 'string') {
      return new Response(JSON.stringify({ error: 'Reviews text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI gateway not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a restaurant review analyst. Always respond with valid JSON only, no markdown or extra text.',
          },
          {
            role: 'user',
            content: `Analyze these restaurant reviews. Return JSON with:
- overall_sentiment (positive/negative/neutral)
- top_praised (list of 3 things customers praised most)
- top_complaints (list of 3 things customers complained about most)
- weekly_summary (2 sentences summarizing the reviews)
- recommendation (1 actionable recommendation to improve)

Reviews:
${reviews}`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_reviews',
              description: 'Return structured analysis of restaurant reviews',
              parameters: {
                type: 'object',
                properties: {
                  overall_sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
                  top_praised: { type: 'array', items: { type: 'string' } },
                  top_complaints: { type: 'array', items: { type: 'string' } },
                  weekly_summary: { type: 'string' },
                  recommendation: { type: 'string' },
                },
                required: ['overall_sentiment', 'top_praised', 'top_complaints', 'weekly_summary', 'recommendation'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_reviews' } },
      }),
    })

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const t = await response.text()
      console.error('AI gateway error:', response.status, t)
      return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await response.json()
    
    // Extract from tool call
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0]
    let analysis
    if (toolCall?.function?.arguments) {
      analysis = typeof toolCall.function.arguments === 'string'
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments
    } else {
      // Fallback: try parsing content directly
      const content = result.choices?.[0]?.message?.content || ''
      analysis = JSON.parse(content)
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
