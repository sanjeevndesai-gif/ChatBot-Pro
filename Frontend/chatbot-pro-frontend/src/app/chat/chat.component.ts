import { Component, OnDestroy } from '@angular/core';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnDestroy {
  messages: Message[] = [
    { text: 'Hello! How can I help you?', sender: 'bot', timestamp: new Date() }
  ];
  newMessage: string = '';

  sendMessage() {
    if (this.newMessage.trim()) {
      this.messages.push({
        text: this.newMessage,
        sender: 'user',
        timestamp: new Date()
      });
      this.newMessage = '';
      setTimeout(() => {
        this.messages.push({
          text: 'Bot reply...',
          sender: 'bot',
          timestamp: new Date()
        });
      }, 1000);
    }
  }

  ngOnDestroy(): void {
    // Cleanup logic here
  }
}
