import json
from datetime import datetime

def handler(event: dict, context) -> dict:
    '''Создание чека для бронирования'''
    
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
        
        seats_str = ", ".join(map(str, sorted(seats)))
        
        receipt_text = f'''
🎬 КИНОТЕАТР ВЕРШИНА
Электронный билет

━━━━━━━━━━━━━━━━━━━━━

🎥 Фильм: {movie_title}
🕐 Время: {movie_time}
📅 Дата: {datetime.now().strftime("%d.%m.%Y")}
🪑 Места: {seats_str}

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

📧 Email: {email}

━━━━━━━━━━━━━━━━━━━━━
Кинотеатр Вершина
📍 г. Москва, ул. Примерная, д. 1
📞 +7 (999) 123-45-67
'''
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'message': f'Бронирование подтверждено! Чек создан для {email}',
                'receipt': receipt_text,
                'email': email,
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
