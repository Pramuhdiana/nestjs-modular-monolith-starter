import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * TrackingGateway — contoh real-time (namespace terpisah dari HTTP).
 * KENAPA namespace `/tracking`:
 * - Auth & rate-limit bisa berbeda dari REST
 * - Client subscribe room per orderId tanpa polling
 *
 * Production: validasi JWT dari handshake.auth.token atau query.
 */
@WebSocketGateway({
  namespace: '/tracking',
  cors: { origin: true },
})
export class TrackingGateway {
  private readonly logger = new Logger(TrackingGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`client connected ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`client disconnected ${client.id}`);
  }

  @SubscribeMessage('subscribe_order')
  handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { orderId: number }) {
    const room = `order:${body.orderId}`;
    void client.join(room);
    return { ok: true, room };
  }

  /** Dipanggil dari service lain jika perlu broadcast status order */
  emitOrderUpdate(orderId: number, payload: unknown) {
    this.server.to(`order:${orderId}`).emit('order:update', payload);
  }
}
