import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

def handler(event: dict, context) -> dict:
    '''Отправка чека на email после бронирования билетов'''
    
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
        
        email = data.get('email')
        movie_title = data.get('movieTitle')
        movie_time = data.get('movieTime')
        seats = data.get('seats', [])
        ticket_price = data.get('ticketPrice', 0)
        cart = data.get('cart', [])
        
        if not email or not movie_title:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Email и название фильма обязательны'})
            }
        
        tickets_total = ticket_price * len(seats)
        food_total = sum(item['price'] * item['quantity'] for item in cart)
        total = tickets_total + food_total
        
        html_content = f'''
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: 'Arial', sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 20px;
                    margin: 0;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                }}
                .header {{
                    background: linear-gradient(135deg, #9b87f5 0%, #7E69AB 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 32px;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.3);
                }}
                .content {{
                    padding: 30px;
                }}
                .movie-info {{
                    background: #f8f9ff;
                    border-left: 4px solid #9b87f5;
                    padding: 20px;
                    margin: 20px 0;
                    border-radius: 8px;
                }}
                .movie-info h2 {{
                    margin: 0 0 10px 0;
                    color: #1A1F2C;
                    font-size: 24px;
                }}
                .info-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #e5e7eb;
                }}
                .info-row:last-child {{
                    border-bottom: none;
                }}
                .label {{
                    color: #666;
                    font-weight: 500;
                }}
                .value {{
                    color: #1A1F2C;
                    font-weight: bold;
                }}
                .seats {{
                    background: #fff4ed;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 15px 0;
                }}
                .seats-list {{
                    color: #F97316;
                    font-size: 18px;
                    font-weight: bold;
                }}
                .cart-section {{
                    background: #f0fdf4;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                }}
                .cart-item {{
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    color: #1A1F2C;
                }}
                .total {{
                    background: linear-gradient(135deg, #9b87f5 0%, #D946EF 100%);
                    color: white;
                    padding: 20px;
                    margin: 20px 0;
                    border-radius: 8px;
                    text-align: center;
                }}
                .total h3 {{
                    margin: 0 0 10px 0;
                    font-size: 18px;
                    opacity: 0.9;
                }}
                .total .amount {{
                    font-size: 36px;
                    font-weight: bold;
                    margin: 0;
                }}
                .footer {{
                    text-align: center;
                    padding: 20px;
                    color: #666;
                    font-size: 14px;
                    background: #f9fafb;
                }}
                .qr-placeholder {{
                    text-align: center;
                    padding: 20px;
                    background: #fafafa;
                    border-radius: 8px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎬 КИНОТЕАТР ВЕРШИНА</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Электронный билет</p>
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
                            <span class="value">{datetime.now().strftime("%d.%m.%Y")}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">🎟️ Количество билетов:</span>
                            <span class="value">{len(seats)} шт</span>
                        </div>
                    </div>
                    
                    <div class="seats">
                        <div class="label" style="margin-bottom: 10px;">🪑 Ваши места:</div>
                        <div class="seats-list">{", ".join(map(str, sorted(seats)))}</div>
                    </div>
                    
                    <div class="info-row">
                        <span class="label">Билеты ({len(seats)} × {ticket_price}₽):</span>
                        <span class="value">{tickets_total}₽</span>
                    </div>
        '''
        
        if cart:
            html_content += '''
                    <div class="cart-section">
                        <h3 style="margin: 0 0 15px 0; color: #1A1F2C;">🍿 Кинобар:</h3>
            '''
            for item in cart:
                item_total = item['price'] * item['quantity']
                html_content += f'''
                        <div class="cart-item">
                            <span>{item['name']} × {item['quantity']}</span>
                            <span style="font-weight: bold;">{item_total}₽</span>
                        </div>
                '''
            html_content += f'''
                        <div class="cart-item" style="border-top: 2px solid #dcfce7; margin-top: 10px; padding-top: 10px;">
                            <span style="font-weight: bold;">Итого кинобар:</span>
                            <span style="font-weight: bold; color: #16a34a;">{food_total}₽</span>
                        </div>
                    </div>
            '''
        
        html_content += f'''
                    <div class="total">
                        <h3>ИТОГО К ОПЛАТЕ</h3>
                        <p class="amount">{total}₽</p>
                    </div>
                    
                    <div class="qr-placeholder">
                        <p style="color: #666; margin: 0;">✅ Бронирование подтверждено!</p>
                        <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
                            Предъявите это письмо на кассе кинотеатра
                        </p>
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
        </html>
        '''
        
        smtp_host = os.environ.get('SMTP_HOST')
        smtp_port = int(os.environ.get('SMTP_PORT', '587'))
        smtp_user = os.environ.get('SMTP_USER')
        smtp_password = os.environ.get('SMTP_PASSWORD')
        
        if not all([smtp_host, smtp_user, smtp_password]):
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'SMTP настройки не заданы. Проверьте секреты проекта.'})
            }
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'🎬 Билеты в кинотеатр Вершина - {movie_title}'
        msg['From'] = smtp_user
        msg['To'] = email
        
        html_part = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(html_part)
        
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'message': f'Чек отправлен на {email}'
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': f'Ошибка отправки: {str(e)}'
            })
        }
