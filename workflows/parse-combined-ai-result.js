/**
 * Code Node để parse kết quả từ comprehensive_analysis node
 * Sử dụng trong n8n workflow sau node AI tổng hợp
 */

// Lấy kết quả từ AI node
const aiResult = $json.output || $json;

console.log('Raw AI Result:', JSON.stringify(aiResult, null, 2));

// Parse và format giống như 6 node cũ để tương thích với Merge node
let parsed = {};

try {
  // Nếu AI trả về string, parse JSON
  let parsedData = aiResult;
  if (typeof aiResult === 'string') {
    // Loại bỏ markdown code blocks nếu có
    const cleanJson = aiResult
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    
    // Tìm JSON trong string
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedData = JSON.parse(jsonMatch[0]);
    } else {
      parsedData = JSON.parse(cleanJson);
    }
  }
  
  // Format để tương thích với Merge node
  parsed = {
    // main_theme format
    main_theme: {
      output: {
        main_theme: parsedData.main_theme || ""
      }
    },
    
    // document_summary format
    document_summary: {
      output: {
        document_summary: Array.isArray(parsedData.document_summary) 
          ? parsedData.document_summary 
          : []
      }
    },
    
    // key_takeaways format
    key_takeaways: {
      output: {
        key_takeaways: Array.isArray(parsedData.key_takeaways) 
          ? parsedData.key_takeaways 
          : []
      }
    },
    
    // gaps_and_limitations format
    gaps_and_limitations: {
      output: {
        gaps_and_limitations: Array.isArray(parsedData.gaps_and_limitations) 
          ? parsedData.gaps_and_limitations 
          : []
      }
    },
    
    // follow_up_questions format
    follow_up_questions: {
      output: {
        follow_up_questions: Array.isArray(parsedData.follow_up_questions) 
          ? parsedData.follow_up_questions 
          : []
      }
    },
    
    // terminology_to_clarify format
    terminology_to_clarify: {
      output: {
        terminology_to_clarify: Array.isArray(parsedData.terminology_to_clarify) 
          ? parsedData.terminology_to_clarify 
          : []
      }
    }
  };
  
  console.log('Parsed Result:', JSON.stringify(parsed, null, 2));
  
} catch (error) {
  console.error('Error parsing AI result:', error);
  console.error('Raw data:', aiResult);
  
  // Fallback với empty data
  parsed = {
    main_theme: { output: { main_theme: "Error parsing AI result" } },
    document_summary: { output: { document_summary: [] } },
    key_takeaways: { output: { key_takeaways: [] } },
    gaps_and_limitations: { output: { gaps_and_limitations: [] } },
    follow_up_questions: { output: { follow_up_questions: [] } },
    terminology_to_clarify: { output: { terminology_to_clarify: [] } }
  };
}

// Return format tương thích với Merge node
// Merge node cần nhận 1 item với tất cả data
return [{
  json: {
    main_theme: parsed.main_theme,
    document_summary: parsed.document_summary,
    key_takeaways: parsed.key_takeaways,
    gaps_and_limitations: parsed.gaps_and_limitations,
    follow_up_questions: parsed.follow_up_questions,
    terminology_to_clarify: parsed.terminology_to_clarify
  }
}];

