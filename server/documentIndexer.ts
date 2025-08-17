import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

interface LessonDocument {
  id: string;
  subject: string;
  standard: string;
  lessonNumber: string;
  title: string;
  content: string;
  keywords: string[];
}

class DocumentIndexer {
  private documents: LessonDocument[] = [];
  private searchIndex: Map<string, string[]> = new Map();

  async loadDocuments() {
    try {
      const lessonDir = path.join(process.cwd(), 'lesson_dataset');
      
      // Check if directory exists
      if (!fs.existsSync(lessonDir)) {
        console.log('Lesson dataset directory not found, skipping document loading');
        return;
      }
      
      const files = fs.readdirSync(lessonDir);
      console.log(`Found ${files.length} files in lesson dataset`);
      
      for (const file of files) {
        if (file.endsWith('.docx')) {
          try {
            const doc = await this.parseDocument(file);
            this.documents.push(doc);
            this.indexDocument(doc);
            console.log(`Loaded document: ${file}`);
          } catch (error) {
            console.error(`Error loading document ${file}:`, error);
          }
        }
      }
      
      console.log(`Successfully loaded ${this.documents.length} lesson documents`);
    } catch (error) {
      console.error('Error loading lesson documents:', error);
    }
  }

  private async parseDocument(filename: string): Promise<LessonDocument> {
    const filePath = path.join(process.cwd(), 'lesson_dataset', filename);
    const buffer = fs.readFileSync(filePath);
    
    // Extract text from DOCX
    const result = await mammoth.extractRawText({ buffer });
    const content = result.value;
    
    // Parse filename to extract metadata
    const metadata = this.parseFilename(filename);
    
    return {
      id: filename,
      subject: metadata.subject,
      standard: metadata.standard,
      lessonNumber: metadata.lessonNumber,
      title: metadata.title,
      content: content,
      keywords: this.extractKeywords(content)
    };
  }

  private parseFilename(filename: string) {
    // Parse "Std 8 Math Lesson No.34.docx"
    const match = filename.match(/Std\s+(\w+)\s+(\w+)\s+Lesson\s+No\.?(\d+)/i);
    
    if (match) {
      return {
        standard: match[1] || 'Unknown',
        subject: match[2] || 'Unknown',
        lessonNumber: match[3] || 'Unknown',
        title: filename.replace('.docx', '')
      };
    }
    
    // Fallback parsing for other formats
    return {
      standard: 'Unknown',
      subject: 'Unknown',
      lessonNumber: 'Unknown',
      title: filename.replace('.docx', '')
    };
  }

  private extractKeywords(content: string): string[] {
    // Extract important terms, concepts, formulas
    const words = content.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must']);
    
    return words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 20); // Top 20 keywords
  }

  private indexDocument(doc: LessonDocument) {
    // Create search index
    const searchableText = `${doc.subject} ${doc.standard} ${doc.lessonNumber} ${doc.content}`;
    this.searchIndex.set(doc.id, searchableText.toLowerCase().split(/\s+/));
  }

  async searchRelevantContent(query: string, subject?: string, standard?: string): Promise<LessonDocument[]> {
    try {
      const queryWords = query.toLowerCase().split(/\s+/);
      const results: { doc: LessonDocument; score: number }[] = [];

      for (const doc of this.documents) {
        let score = 0;
        
        // Subject/standard matching
        if (subject && doc.subject.toLowerCase().includes(subject.toLowerCase())) score += 10;
        if (standard && doc.standard.toLowerCase().includes(standard.toLowerCase())) score += 10;
        
        // Content relevance
        for (const word of queryWords) {
          if (doc.content.toLowerCase().includes(word)) score += 1;
          if (doc.keywords.some(kw => kw.includes(word))) score += 2;
        }
        
        if (score > 0) {
          results.push({ doc, score });
        }
      }

      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, 3) // Top 3 most relevant
        .map(r => r.doc);
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    }
  }

  getDocumentsBySubject(subject: string): LessonDocument[] {
    return this.documents.filter(doc => 
      doc.subject.toLowerCase().includes(subject.toLowerCase())
    );
  }

  getDocumentsByStandard(standard: string): LessonDocument[] {
    return this.documents.filter(doc => 
      doc.standard.toLowerCase().includes(standard.toLowerCase())
    );
  }

  getAvailableSubjects(): string[] {
    return [...new Set(this.documents.map(doc => doc.subject))];
  }

  getAvailableStandards(): string[] {
    return [...new Set(this.documents.map(doc => doc.standard))];
  }
}

export const documentIndexer = new DocumentIndexer();
