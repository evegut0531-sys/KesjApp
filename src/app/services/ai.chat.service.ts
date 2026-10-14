import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ChatMessage } from '../models/chat.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  private readonly GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  private conversationHistory: ChatMessage[] = [];

  // System prompt personalizado para KesjApp
  private readonly systemPrompt = `Eres "Habibot" ✨, el asistente virtual inteligente y compañero de desarrollo personal de KesjApp.

Misión de KesjApp:
"Crear y compartir aplicaciones tecnológicas que integren herramientas de organización, hábitos saludables y bienestar integral, contribuyendo al desarrollo personal y al mejoramiento de la calidad de vida de los usuarios."

Tu personalidad y estilo:
- Tono: Empático, motivador, claro, estructurado y muy servicial.
- Idioma: Respondes SIEMPRE en español.
- Usas emojis relacionados con bienestar, constancia y organización de forma amigable (✨ 🌱 💧 📋 🎯 😊 🔥).
- Respuestas concisas (máximo 150-200 palabras), bien formateadas con viñetas o pasos cuando expliques funciones.

Tu conocimiento experto de KesjApp:

1. ACCESO Y CUENTAS (INICIO DE SESIÓN / REGISTRO):
- Cómo iniciar sesión: Ve a la pantalla de login, ingresa tu correo y contraseña (mínimo 6 caracteres) o número telefónico y pulsa "Iniciar sesión".
- ¿No tienes cuenta?: Toca el enlace "Regístrate" para crear una cuenta con tu nombre, correo y contraseña.
- ¿Problemas para iniciar sesión?:
  * Verifica mayúsculas y que no queden espacios antes o después del correo.
  * Si la clave es errónea, asegúrate de escribirla con cuidado usando el icono del ojo para visualizarla.
  * ¡MODO INVITADO!: Si tienes inconvenientes para ingresar o no deseas registrarte en este momento, en la parte inferior de la pantalla de login presiona "Continuar como invitado". Podrás disfrutar de toda la app al instante y tus datos se guardarán de forma segura en tu propio dispositivo.
- Cerrar sesión: En la pestaña "Ajustes", botón "Cerrar Sesión".

2. FUNCIONES DE LA APP:
- Pestaña INICIO:
  * Resumen del día con fecha y racha actual con el icono de fuego 🔥.
  * Métricas rápidas: Hábitos completados vs totales, tareas pendientes y estado de ánimo actual.
  * Acceso directo para marcar tus hábitos de hoy y responder "¿Cómo te sientes hoy?".
- Pestaña HÁBITOS:
  * Cómo crear un hábito: Pulsa el botón "+" (o "Crear Hábito"), escribe el nombre, descripción opcional, frecuencia (Diario o Semanal), selecciona tu color favorito y un icono, luego guarda.
  * Marcar hábito: Pulsa el círculo del hábito. Cada día completado subirá tu racha 🔥.
  * Eliminar: Icono de papelera en la tarjeta del hábito.
- Pestaña TAREAS:
  * Cómo crear una tarea: Pulsa el botón "+", indica título, descripción y nivel de prioridad (Baja, Media o Alta).
  * Filtros de vista: Puedes alternar entre "Pendientes", "Completadas" o "Todas".
  * Marcar tarea: Toca la casilla cuadrada para completarla.
- Pestaña BIENESTAR:
  * Hidratación diaria: Registro de agua con meta recomendada de 8 vasos (aprox. 2L). Usa el botón "+" para sumar vasos tomados y "-" si te equivocaste.
  * Estado de ánimo: Selector con 5 opciones (Muy Mal 😫, Mal 🙁, Normal 😐, Bien 🙂, Excelente 🤩).
  * Agradecimiento del día: Escribe tu reflexión positiva o gratitud de la jornada y presiona "Guardar reflexión".
- Pestaña AJUSTES:
  * Información del perfil, botón para "Cargar datos de prueba" (para explorar la app con ejemplos) o "Restablecer datos".

3. CONSEJOS DE SALUD, HIDRATACIÓN Y HÁBITOS:
- Hidratación: ¿Cuánto tomar al día? La pauta recomendada es de 2 a 2.5 litros al día (aprox. 8 vasos de 250 ml). Pautas recomendadas: 1 vaso al despertar en ayunas para reactivar el metabolismo, 1 vaso antes de las comidas y mantener hidratación durante la actividad física.
- Rutina ideal para el día:
  * Mañana: Vaso de agua al levantarte, unos minutos de luz solar, definir tus 3 tareas más importantes en KesjApp.
  * Tarde: Pausas activas (técnica Pomodoro: 25-50 min de foco por 5 de descanso), mantenerse hidratado.
  * Noche: Marcar tus hábitos completados, escribir tu agradecimiento del día en KesjApp y desconectar pantallas 30 min antes de dormir (7-8 horas de sueño).
- Apoyo emocional: Si el usuario menciona sentirse triste, estresado o agobiado, valida sus emociones con cariño y empatía, sugiérele ejercicios de respiración lenta (4 segundos inhalar, 4 mantener, 4 soltar) y escribir en su diario de gratitud.

Reglas:
- Sé siempre respetuoso, constructivo y motivador.
- Si una pregunta no tiene relación con KesjApp, desarrollo personal o bienestar, responde brevemente y amablemente redirige hacia el bienestar del usuario.
- Aclara que tus consejos de bienestar son orientativos y no sustituyen a un profesional médico o de salud mental.`;

  constructor(private http: HttpClient) {}

  /**
   * Envía un mensaje al asistente de IA y retorna la respuesta
   */
  sendMessage(userMessage: string): Observable<ChatMessage> {
    const apiKey = environment.geminiApiKey;

    // Si no hay API key configurada o tiene el valor por defecto, usar respuestas inteligentes locales
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
          || 'Lo siento, no pude generar una respuesta en este momento. Intenta de nuevo. ✨';

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
        console.error('Error al contactar Gemini API, usando respuesta local:', error);
        return this.getOfflineResponse(userMessage);
      })
    );
  }

  /**
   * Construye el request body para la API de Gemini
   */
  private buildGeminiRequest(userMessage: string): any {
    const contents: any[] = [];

    // System instruction con la personalidad de KesjApp
    const systemInstruction = {
      parts: [{ text: this.systemPrompt }]
    };

    // Historial previo (últimos 10 mensajes)
    const recentHistory = this.conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

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
   * Respuestas inteligentes locales de KesjApp cuando no hay API key o no hay conexión
   */
  private getOfflineResponse(userMessage: string): Observable<ChatMessage> {
    const query = userMessage.toLowerCase().trim();
    let response: string;

    if (query.includes('hola') || query.includes('buenas') || query.includes('hey') || query.includes('saludos')) {
      response = '¡Hola! ✨ Soy Habibot, tu asistente inteligente en KesjApp.\n\nEstoy aquí para acompañarte en tu día a día con:\n• 💧 Monitoreo de hidratación diaria y bienestar.\n• 📋 Creación de hábitos y mantenimiento de tu racha 🔥.\n• ✅ Organización de tareas por prioridad.\n• 😊 Registro de estado de ánimo y reflexiones de gratitud.\n• 🔑 Ayuda para iniciar sesión o resolver dudas de la app.\n\n¿En qué te gustaría enfocarte hoy?';
    } 
    else if (
      query.includes('sesion') || query.includes('sesión') || 
      query.includes('login') || query.includes('cuenta') || 
      query.includes('entrar') || query.includes('iniciar') || 
      query.includes('regist') || query.includes('clave') || 
      query.includes('contraseña') || query.includes('invitado') || 
      query.includes('acceso')
    ) {
      response = '🔑 **Guía de Acceso e Inicio de Sesión en KesjApp**:\n\n' +
        '1. **Iniciar sesión**: Ingresa tu correo y contraseña (mínimo 6 caracteres) y pulsa «Iniciar sesión».\n' +
        '2. **¿No tienes cuenta?**: Toca en «Regístrate» abajo para crear una con tu nombre, correo y contraseña.\n' +
        '3. **¿No puedes iniciar sesión?**:\n' +
        '   • Verifica que tu correo no tenga espacios al inicio o final.\n' +
        '   • Revisa mayúsculas/minúsculas en tu contraseña usando el botón del ojo.\n' +
        '   • **Modo Invitado**: Si tienes problemas o quieres probar la app rápido, pulsa la tarjeta **«Continuar como invitado»** al final del login. ¡Podrás usar todas las funciones y tus datos se guardarán en tu dispositivo!\n' +
        '4. **Cerrar sesión o ver perfil**: Puedes hacerlo desde la pestaña **Ajustes** en la barra inferior.';
    } 
    else if (
      query.includes('agua') || query.includes('hidrat') || 
      query.includes('vaso') || query.includes('litro') || 
      query.includes('beber') || query.includes('sed')
    ) {
      response = '💧 **Guía de Hidratación en KesjApp**:\n\n' +
        '• **¿Cuánta agua tomar al día?** La meta recomendada para la mayoría de adultos es de **2 a 2.5 litros diarios**, lo que equivale aproximadamente a **8 vasos de agua** (de 250 ml cada uno).\n\n' +
        '• **¿Cómo registrarlo en la app?**:\n' +
        '  1. Ve a la pestaña **Bienestar** en la barra inferior.\n' +
        '  2. En la tarjeta «Hidratación diaria», presiona el botón circular **«+»** cada vez que tomes un vaso de agua.\n' +
        '  3. Si te equivocaste, puedes restar con el botón **«-»**.\n\n' +
        '• **Consejo de oro**: Comienza tu mañana con 1 vaso de agua al despertar para reactivar tu organismo y energía.';
    } 
    else if (
      query.includes('animo') || query.includes('ánimo') || 
      query.includes('sentir') || query.includes('siento') || 
      query.includes('triste') || query.includes('mal') || 
      query.includes('estres') || query.includes('estrés') || 
      query.includes('emocion') || query.includes('emoción') ||
      query.includes('agradec') || query.includes('gratitud') ||
      query.includes('reflexion') || query.includes('reflexión')
    ) {
      response = '😊 **Estado de Ánimo y Bienestar Emocional**:\n\n' +
        '• **¿Cómo registrar tu ánimo?**:\n' +
        '  En la pestaña **Inicio** o en la pestaña **Bienestar**, encontrarás la sección «¿Cómo te sientes hoy?». Solo pulsa la opción que mejor represente tu día: *Muy Mal*, *Mal*, *Normal*, *Bien* o *Excelente*.\n\n' +
        '• **Agradecimiento del día**:\n' +
        '  En la pestaña **Bienestar**, escribe algo positivo que te haya ocurrido hoy en el cuadro de reflexión y pulsa «Guardar reflexión».\n\n' +
        '• **Si hoy no es un buen día**: Recuerda ser amable contigo mismo/a 🌱. Tómate una pausa de 5 minutos, respira hondo (inhalar en 4 seg, sostener en 4 y exhalar en 4) y celebra cualquier pequeño paso que logres.';
    } 
    else if (
      query.includes('habito') || query.includes('hábito') || 
      query.includes('racha') || query.includes('fuego') || 
      query.includes('rutina')
    ) {
      response = '📋 **Hábitos y Rachas en KesjApp**:\n\n' +
        '• **Cómo crear un hábito**:\n' +
        '  1. Ve a la pestaña **Hábitos** en la barra inferior (o pulsa «Crear el primero» en Inicio).\n' +
        '  2. Pulsa el botón flotante circular **«+»**.\n' +
        '  3. Elige un nombre (ej. «Lectura 15 min»), frecuencia (*Diario* o *Semanal*), tu color favorito y un icono.\n' +
        '  4. Presiona «Guardar hábito».\n\n' +
        '• **Marcar hábito y subir racha 🔥**:\n' +
        '  Toca el círculo junto a cada hábito cuando lo cumplas hoy. ¡Cada día que mantengas tu hábito aumentará el contador de fuego de tu racha!';
    } 
    else if (
      query.includes('tarea') || query.includes('pendiente') || 
      query.includes('organizar') || query.includes('prioridad') ||
      query.includes('completad')
    ) {
      response = '✅ **Organización de Tareas en KesjApp**:\n\n' +
        '• **Cómo crear una tarea**:\n' +
        '  1. Ve a la pestaña **Tareas** en la barra inferior.\n' +
        '  2. Pulsa el botón circular **«+»**.\n' +
        '  3. Escribe el título, descripción opcional y asigna su prioridad (*Baja*, *Media* o *Alta*).\n' +
        '  4. Pulsa «Guardar tarea».\n\n' +
        '• **Filtros rápidos**:\n' +
        '  En la parte superior puedes filtrar entre tareas *Pendientes*, *Completadas* o *Todas* para mantener tu mente clara y enfocada.';
    } 
    else if (
      query.includes('dia') || query.includes('día') || 
      query.includes('consejo') || query.includes('mejor') || 
      query.includes('recomend') || query.includes('manana') ||
      query.includes('mañana') || query.includes('noche') ||
      query.includes('productiv')
    ) {
      response = '✨ **Mejores Consejos para tu Día con KesjApp**:\n\n' +
        '1. 🌅 **En la Mañana**:\n' +
        '   • Toma tu primer vaso de agua para rehidratar el cuerpo.\n' +
        '   • Define tus **3 tareas prioritarias** en KesjApp antes de revisar redes sociales.\n' +
        '2. ☀️ **Durante el Día**:\n' +
        '   • Trabaja en bloques de enfoque (25 a 45 min) y haz pausas activas de 5 min.\n' +
        '   • Suma tus vasos de agua en la pestaña **Bienestar**.\n' +
        '3. 🌙 **En la Noche**:\n' +
        '   • Marca los hábitos que completaste para mantener tu racha 🔥.\n' +
        '   • Escribe tu gratitud del día y desconéctate 30 min antes de dormir para un descanso profundo (7-8 horas).';
    } 
    else {
      response = '✨ **¡Hola! Soy Habibot, tu asistente de KesjApp.**\n\n' +
        'Puedo orientarte con cualquiera de estos temas:\n' +
        '• 💧 **Hidratación diaria**: ¿Cuánta agua tomar y cómo registrarla?\n' +
        '• 📋 **Hábitos**: Cómo crear tus rutinas y aumentar tu racha 🔥.\n' +
        '• ✅ **Tareas**: Cómo organizar tus pendientes por prioridad.\n' +
        '• 😊 **Bienestar**: Registro de estado de ánimo y agradecimiento del día.\n' +
        '• 🔑 **Acceso**: Cómo iniciar sesión, registrarte o usar el modo invitado.\n' +
        '• 🌟 **Consejos del día**: Recomendaciones de productividad y salud.\n\n' +
        '¿Sobre cuál de estos temas deseas saber más?';
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
      content: response,
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