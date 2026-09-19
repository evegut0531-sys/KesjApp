import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ChatMessage } from '../models/chat.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  private readonly GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  private conversationHistory: ChatMessage[] = [];
// System prompt personalizado para BiciMap
  private readonly systemPrompt = `Eres "BiciBot" 🚴, el asistente inteligente de BiciMap, una aplicación para ciclistas urbanos en Bogotá, Colombia.

Tu personalidad:
- Amigable, entusiasta del ciclismo urbano y muy servicial
- Respondes SIEMPRE en español
- Usas emojis relacionados con ciclismo de forma moderada 🗺️ 🔧 ⚠️
- Eres conciso pero completo en tus respuestas

Tu conocimiento especializado incluye:
- Ciclorutas y vías seguras de Bogotá (conoces la red de ciclorutas de la ciudad)
- Consejos de seguridad vial para ciclistas colombianos
- Mantenimiento básico de bicicletas (parches, frenos, cadena, llantas)
- Eventos de ciclismo y ciclopaseos de la comunidad
- Puntos de interés para ciclistas: talleres, parqueaderos seguros, estaciones de bicis públicas, puntos de descanso
- Normatividad de tránsito para ciclistas en Colombia (Código Nacional de Tránsito)
- Clima y recomendaciones según el tiempo en Bogotá
- La app BiciMap: puedes explicar cómo usar sus funciones (mapa, rutas, reportes, eventos, puntos de interés)

Funciones de BiciMap que conoces:
- Mapa interactivo con GPS y reportes en tiempo real
- Calculadora de rutas ciclistas (origen -> destino)
- Reportes comunitarios (obras, peligros, congestión)
- Puntos de interés (estaciones, talleres, parqueaderos, descanso)
- Eventos ciclísticos (ciclopaseos, talleres de mecánica)
- Perfil con estadísticas (km recorridos, recorridos, reportes)

Reglas importantes:
- Si no sabes algo con certeza, dilo honestamente
- Siempre promueve la seguridad vial: casco, luces, chaleco reflectivo
- No des consejos médicos, solo recomienda acudir a un profesional
- Si preguntan sobre rutas específicas, sugiere usar la función "Calcular Ruta" de la app
- Mantén respuestas de máximo 200 palabras a menos que el usuario pida más detalle`;

  constructor(private http: HttpClient) {}
  /**
   * /*
   * Envía un mensaje al asistente de IA y retorna la respuesta
   */
  sendMessage(userMessage: string): Observable<ChatMessage> {
    const apiKey = environment.geminiApiKey;

    if (!apiKey || apiKey === 'TU_API_KEY_AQUI') {
      return this.getOfflineResponse(userMessage);
    }

    // Agregar mensaje del usuario al historial
    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    this.conversationHistory.push(userMsg);

    // Construir el cuerpo de la petición para Gemini
    const body = this.buildGeminiRequest(userMessage);
    return this.http.post<any>(`${this.GEMINI_URL}?key=${apiKey}`, body).pipe(
      map(response => {
        const text = response?.candidates?.[0]?.content?.parts?.[0]?.text 
          || 'Lo siento, no pude generar una respuesta. Intenta de nuevo. 🚴';

        const assistantMsg: ChatMessage = {
          id: 'msg_' + Date.now(),
          role: 'assistant',
          content: text,
          timestamp: new Date()
        };
        this.conversationHistory.push(assistantMsg);
        return assistantMsg;
      }),
      catchError(error => {
        console.error('Error al contactar Gemini API:', error);
        return this.getOfflineResponse(userMessage);
      })
    );
}
/**
   * Construye el request body para la API de Gemini
   */
  private buildGeminiRequest(userMessage: string): any {
    // Construir historial de conversación para contexto
    const contents: any[] = [];

    // Agregar system instruction
    const systemInstruction = {
      parts: [{ text: this.systemPrompt }]
    };

    // Agregar historial previo (últimos 10 mensajes para no exceder tokens)
    const recentHistory = this.conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    // Si no hay historial, agregar al menos el mensaje actual
    if (contents.length === 0) {
      contents.push({
        role: 'user',
        parts: [{ text: userMessage }]
      });
    }

    return {
      system_instruction: systemInstruction,
      contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024
      }
    };
  }
  /**
   * Respuestas offline cuando no hay API key o no hay conexión
   */
  private getOfflineResponse(userMessage: string): Observable<ChatMessage> {
    const query = userMessage.toLowerCase();
    let response: string;

    if (query.includes('hola') || query.includes('hey') || query.includes('buenas')) {
      response = '¡Hola, ciclista! 🚴 Soy BiciBot, tu asistente de BiciMap. ¿En qué puedo ayudarte hoy? Puedo darte consejos de rutas, seguridad, mantenimiento de tu bici o ayudarte con la app.';
    } else if (query.includes('ruta') || query.includes('camino') || query.includes('llegar')) {
      response = '🗺️ Para calcular una ruta, ve a la sección "Calcular Ruta" en el menú lateral. Ingresa tu destino y te mostraré la mejor ruta ciclista con distancia y tiempo estimado. ¡Recuerda llevar casco! 🪖';
    } else if (query.includes('reporte') || query.includes('peligro') || query.includes('hueco')) {
      response = '⚠️ Puedes crear un reporte comunitario desde el botón "+" en la barra superior o desde la sección "Reportes". Puedes reportar obras, peligros, congestión y problemas en ciclorutas. ¡Tu reporte ayuda a otros ciclistas!';
    } else if (query.includes('segur') || query.includes('casco') || query.includes('luz')) {
      response = '🛡️ Consejos de seguridad esenciales:\n• Usa siempre casco\n• Lleva luces delantera (blanca) y trasera (roja)\n• Usa chaleco reflectivo de noche\n• Respeta los semáforos y señales\n• Circula por las ciclorutas cuando';
    } else if (query.includes('manten') || query.includes('arregl') || query.includes('pinch') || query.includes('freno')) {
      response = '🔧 Para mantenimiento básico de tu bici:\n• Revisa la presión de llantas antes de salir\n• Lubrica la cadena cada 2 semanas\n• Verifica que los frenos respondan bien\n• Busca un taller en "Puntos de Interés" de la';
    } else if (query.includes('evento') || query.includes('paseo') || query.includes('ciclopaseo')) {
      response = '🎉 Consulta los próximos eventos ciclísticos en la sección "Eventos" del menú. Allí encontrarás ciclopaseos nocturnos, talleres de mecánica y más actividades de la comunidad ciclista de Bogotá.';
    } else if (query.includes('clima') || query.includes('lluv') || query.includes('tiempo')) {
      response = '🌦️ En Bogotá el clima puede cambiar rápido. Te recomiendo:\n• Lleva siempre una chaqueta impermeable ligera\n• Si llueve fuerte, busca refugio bajo un puente o techo\n• Reduce la velocidad en piso mojado\n• Usa lu';
    } else {
      response = '💬 ¡Gracias por tu mensaje! Soy BiciBot y puedo ayudarte con:\n• 🗺️ Cómo usar las rutas de BiciMap\n• ⚠️ Crear reportes de peligros\n• 🔧 Mantenimiento de tu bici\n• 🛡️ Consejos de seguridad\n• 🎉 Eventos ciclis';
    }

    // Agregar al historial
    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    this.conversationHistory.push(userMsg);
    const assistantMsg: ChatMessage = {
      id: 'msg_' + (Date.now() + 1),
      role: 'assistant',
      content: response + '\n\n💡 Tip: Configura tu API key de Gemini en la app para respuestas más inteligentes y personalizadas.',
      timestamp: new Date()
    };
    this.conversationHistory.push(assistantMsg);

    return of(assistantMsg);
  }

  /**
   * Obtiene el historial de conversación actual
   */
  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Limpia el historial de conversación
   */
  clearConversation(): void {
    this.conversationHistory = [];
  }
}