import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

def handler(event: dict, context) -> dict:
    '''Отправка всех чеков на azhukovao@bk.ru'''
    
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': ''
        }
    
    if event.get('httpMethod') != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    try:
        data = json.loads(event.get('body', '{}'))
        
        client_email = data.get('email', 'Не указан')
        movie_title = data.get('movieTitle')
        movie_time = data.get('movieTime')
        seats = data.get('seats', [])
        ticket_price = data.get('ticketPrice', 0)
        cart = data.get('cart', [])
        
        if not movie_title:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Название фильма обязательно'})
            }
        
        tickets_total = ticket_price * len(seats)
        food_total = sum(item['price'] * item['quantity'] for item in cart)
        total = tickets_total + food_total
        
        seats_str = ", ".join(map(str, sorted(seats)))
        
        html_content = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; margin: 0; }}
        .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }}
        .header {{ background: linear-gradient(135deg, #9b87f5 0%, #7E69AB 100%); color: white; padding: 30px; text-align: center; }}
        .header h1 {{ margin: 0; font-size: 32px; text-shadow: 0 2px 10px rgba(0,0,0,0.3); }}
        .content {{ padding: 30px; }}
        .movie-info {{ background: #f8f9ff; border-left: 4px solid #9b87f5; padding: 20px; margin: 20px 0; border-radius: 8px; }}
        .movie-info h2 {{ margin: 0 0 10px 0; color: #1A1F2C; font-size: 24px; }}
        .info-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }}
        .info-row:last-child {{ border-bottom: none; }}
        .label {{ color: #666; font-weight: 500; }}
        .value {{ color: #1A1F2C; font-weight: bold; }}
        .seats {{ background: #fff4ed; padding: 15px; border-radius: 8px; margin: 15px 0; }}
        .seats-list {{ color: #F97316; font-size: 18px; font-weight: bold; }}
        .cart-section {{ background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .cart-item {{ display: flex; justify-content: space-between; padding: 8px 0; color: #1A1F2C; }}
        .total {{ background: linear-gradient(135deg, #9b87f5 0%, #D946EF 100%); color: white; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }}
        .total h3 {{ margin: 0 0 10px 0; font-size: 18px; opacity: 0.9; }}
        .total .amount {{ font-size: 36px; font-weight: bold; margin: 0; }}
        .footer {{ text-align: center; padding: 20px; color: #666; font-size: 14px; background: #f9fafb; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 КИНОТЕАТР ВЕРШИНА</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Новое бронирование</p>
        </div>
        <div class="content">
            <div class="movie-info">
                <h2>🎥 {movie_title}</h2>
                <div class="info-row">
                    <span class="label">🕐 Время сеанса:</span>
                    <span class="value">{movie_time}</span>
                </div>
                <div class="info-row">
                    <span class="label">📅 Дата:</span>
                    <span class="value">{datetime.now().strftime("%d.%m.%Y %H:%M")}</span>
                </div>
                <div class="info-row">
                    <span class="label">🎟️ Количество билетов:</span>
                    <span class="value">{len(seats)} шт</span>
                </div>
                <div class="info-row">
                    <span class="label">📧 Email клиента:</span>
                    <span class="value">{client_email}</span>
                </div>
            </div>
            
            <div class="seats">
                <div class="label" style="margin-bottom: 10px;">🪑 Забронированные места:</div>
                <div class="seats-list">{seats_str}</div>
            </div>
            
            <div class="info-row">
                <span class="label">Билеты ({len(seats)} × {ticket_price}₽):</span>
                <span class="value">{tickets_total}₽</span>
            </div>'''
        
        if cart:
            html_content += '''
            <div class="cart-section">
                <h3 style="margin: 0 0 15px 0; color: #1A1F2C;">🍿 Кинобар:</h3>'''
            for item in cart:
                item_total = item['price'] * item['quantity']
                html_content += f'''
                <div class="cart-item">
                    <span>{item['name']} × {item['quantity']}</span>
                    <span style="font-weight: bold;">{item_total}₽</span>
                </div>'''
            html_content += f'''
                <div class="cart-item" style="border-top: 2px solid #dcfce7; margin-top: 10px; padding-top: 10px;">
                    <span style="font-weight: bold;">Итого кинобар:</span>
                    <span style="font-weight: bold; color: #16a34a;">{food_total}₽</span>
                </div>
            </div>'''
        
        html_content += f'''
            <div class="total">
                <h3>ИТОГО К ОПЛАТЕ</h3>
                <p class="amount">{total}₽</p>
            </div>
            
            <div style="text-align: center; padding: 20px; background: #fafafa; border-radius: 8px; margin: 20px 0;">
                <p style="color: #16a34a; margin: 0; font-size: 18px; font-weight: bold;">✅ Бронирование подтверждено!</p>
            </div>
        </div>
        
        <div class="footer">
            <p style="margin: 0 0 10px 0;"><strong>Кинотеатр Вершина</strong></p>
            <p style="margin: 0;">📍 г. Москва, ул. Примерная, д. 1</p>
            <p style="margin: 5px 0;">📞 +7 (999) 123-45-67</p>
            <p style="margin: 5px 0;">⏰ Ежедневно с 10:00 до 23:00</p>
        </div>
    </div>
</body>
</html>'''
        
        receipt_text = f'''
🎬 КИНОТЕАТР ВЕРШИНА - НОВОЕ БРОНИРОВАНИЕ

━━━━━━━━━━━━━━━━━━━━━

🎥 Фильм: {movie_title}
🕐 Время: {movie_time}
📅 Дата: {datetime.now().strftime("%d.%m.%Y %H:%M")}
🪑 Места: {seats_str}
📧 Email клиента: {client_email}

━━━━━━━━━━━━━━━━━━━━━

💰 ЧЕК:
Билеты: {len(seats)} × {ticket_price}₽ = {tickets_total}₽
'''
        
        if cart:
            receipt_text += '\n🍿 КИНОБАР:\n'
            for item in cart:
                item_total = item['price'] * item['quantity']
                receipt_text += f"  • {item['name']} x{item['quantity']} = {item_total}₽\n"
            receipt_text += f'  Итого кинобар: {food_total}₽\n'
        
        receipt_text += f'''
━━━━━━━━━━━━━━━━━━━━━
ИТОГО: {total}₽
━━━━━━━━━━━━━━━━━━━━━

✅ Бронирование подтверждено!
'''
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f'🎬 Новое бронирование - {movie_title} ({movie_time})'
            msg['From'] = 'cinema-vershina@notification.ru'
            msg['To'] = 'azhukovao@bk.ru'
            
            text_part = MIMEText(receipt_text, 'plain', 'utf-8')
            html_part = MIMEText(html_content, 'html', 'utf-8')
            
            msg.attach(text_part)
            msg.attach(html_part)
            
            password = os.environ.get('MAIL_RU_PASSWORD')
            if not password:
                raise Exception('Пароль не настроен. Добавьте секрет MAIL_RU_PASSWORD')
            
            with smtplib.SMTP('smtp.mail.ru', 587, timeout=10) as server:
                server.starttls()
                server.login('azhukovao@bk.ru', password)
                server.send_message(msg)
            
            email_sent = True
            email_error = None
        except Exception as e:
            email_sent = False
            email_error = str(e)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'message': 'Бронирование подтверждено!',
                'receipt': receipt_text,
                'email_sent': email_sent,
                'email_error': email_error,
                'total': total
            }, ensure_ascii=False)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'Ошибка: {str(e)}'})
        }