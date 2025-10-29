import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Message, Author } from './types';
import Markdown from 'react-markdown';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    setMessages([
      {
        author: Author.MODEL,
        text: "Hello! I'm your MigosiDesigns AI Mentor. How can I help you with your graphic design journey today? You can also ask me to create an image by typing `/imagine` followed by a prompt.",
        id: 'initial-message',
      }
    ])
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      author: Author.USER,
      text: input,
      id: Date.now().toString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const isImagePrompt = currentInput.trim().startsWith('/imagine ');

      if (isImagePrompt) {
        const prompt = currentInput.trim().substring('/imagine '.length);
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: prompt }],
          },
          config: {
              responseModalities: [Modality.IMAGE],
          },
        });
        
        let imageUrl = '';
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            imageUrl = `data:image/png;base64,${base64ImageBytes}`;
          }
        }

        if(imageUrl) {
            const modelMessage: Message = {
                author: Author.MODEL,
                text: `Here is my take on: "${prompt}"`,
                id: Date.now().toString() + '-model',
                imageUrl: imageUrl,
            };
            setMessages((prev) => [...prev, modelMessage]);
        } else {
             throw new Error("No image data received from API.");
        }

      } else {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `You are MigosiDesigns, a friendly and expert graphic design mentor. Your goal is to guide and assist users with their graphic design questions. Provide encouraging, insightful, and practical advice. User prompt: ${currentInput}`,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const modelText = response.text;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        
        const references = groundingChunks
          ?.map((chunk: any) => ({
            uri: chunk.web?.uri,
            title: chunk.web?.title,
          }))
          .filter((ref: any) => ref.uri && ref.title);


        const modelMessage: Message = {
          author: Author.MODEL,
          text: modelText,
          id: Date.now().toString() + '-model',
          references: references,
        };

        setMessages((prev) => [...prev, modelMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        author: Author.MODEL,
        text: 'Sorry, I encountered an error. Please try again.',
        id: Date.now().toString() + '-error',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
        <header className="bg-gray-800 p-4 shadow-md">
            <h1 className="text-2xl font-bold text-center text-teal-400">MigosiDesigns AI Mentor</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {messages.map((msg) => (
            <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                msg.author === Author.USER ? 'justify-end' : 'justify-start'
                }`}
            >
                {msg.author === Author.MODEL && (
                <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center font-bold text-gray-900 flex-shrink-0">M</div>
                )}
                <div
                className={`max-w-xl p-4 rounded-xl shadow-lg ${
                    msg.author === Author.USER
                    ? 'bg-blue-600 rounded-br-none'
                    : 'bg-gray-700 rounded-bl-none'
                }`}
                >
                <div className="prose prose-invert">
                    <Markdown>{msg.text}</Markdown>
                </div>
                 {msg.imageUrl && (
                  <div className="mt-4">
                    <img src={msg.imageUrl} alt="Generated design concept" className="rounded-lg max-w-full h-auto" />
                  </div>
                )}
                {msg.references && msg.references.length > 0 && (
                  <div className="mt-4 border-t border-gray-600 pt-2">
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">References:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {msg.references.map((ref, index) => (
                        <li key={index} className="text-xs">
                          <a href={ref.uri} target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">
                            {ref.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                </div>
                 {msg.author === Author.USER && (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white flex-shrink-0">U</div>
                )}
            </div>
            ))}
            {isLoading && (
                 <div className="flex justify-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center font-bold text-gray-900">M</div>
                    <div className="max-w-xl p-4 rounded-xl shadow-lg bg-gray-700 rounded-bl-none flex items-center space-x-2">
                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse delay-75"></div>
                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse delay-150"></div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </main>
        <footer className="bg-gray-800 p-4 shadow-up">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center bg-gray-700 rounded-full p-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Ask about design, or type '/imagine prompt'..."
                    className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none px-4"
                    disabled={isLoading}
                />
                <button
                    onClick={sendMessage}
                    disabled={isLoading || !input.trim()}
                    className="bg-teal-500 text-white rounded-full p-2 hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-400"
                    aria-label="Send message"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </button>
                </div>
            </div>
        </footer>
    </div>
  );
};

export default App;
