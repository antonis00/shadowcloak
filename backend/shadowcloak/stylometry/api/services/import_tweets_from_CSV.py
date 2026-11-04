# https://www.kaggle.com/crowdflower/twitter-airline-sentiment


import csv
import sqlite3
import re

def deEmojify(text):
    regrex_pattern = re.compile(pattern = "["
        u"\U0001F600-\U0001F64F"  # emoticons
        u"\U0001F300-\U0001F5FF"  # symbols & pictographs
        u"\U0001F680-\U0001F6FF"  # transport & map symbols
        u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
        u"\U0001F1F2-\U0001F1F4"  # Macau flag
        u"\U0001F1E6-\U0001F1FF"  # flags
        u"\U0001F600-\U0001F64F"
        u"\U00002702-\U000027B0"
        u"\U000024C2-\U0001F251"
        u"\U0001f926-\U0001f937"
        u"\U0001F1F2"
        u"\U0001F1F4"
        u"\U0001F620"
        u"\u200d"
        u"\u2640-\u2642"
        "]+", flags=re.UNICODE)
    return regrex_pattern.sub(r'',text)

with open('C:/Users/antonis/Desktop/tweets2.csv', encoding="utf8") as csv_file:
    with sqlite3.connect("C:/Users/antonis/Desktop/files/Stylometry apps/ShadowCloak-BE/shadowcloak/db.sqlite3") as db:
        c = db.cursor()
        csv_reader = csv.reader(csv_file, delimiter=',')
        line_count = 0
        
        for row in csv_reader:
            if line_count == 0:
                print(f'Column names are {", ".join(row)}')
                line_count += 1
            else:
                line_count += 1
                if line_count >= 2000 or line_count == 0 or line_count == 1:
                    break
                author = row[7]
                text = row[10]
                text = re.sub(r'[@]\w+[ \$\t\r\n\,\"\.]+', '', text)
                text = deEmojify(text)
                title = row[0]
                # print(f' Author {author} wrote {title}:  {text}')
                c.execute('SELECT id FROM stylometry_author WHERE name = (?)', (author,))
                author_id = c.fetchone()
                # print(author_id)
                # if author_id == None:
                #     c.execute('INSERT INTO stylometry_author (name, description, user_id) values (?, "Tweet Author",1);', (author,))
                
                if author_id != None:
                    c.execute("INSERT INTO stylometry_document (title, description, body, active, publication_date, created_at, updated_at, author_id, group_id) VALUES(?, '', ?, 1, '2002-02-20', '2020-10-14 10:00:00', '2020-10-14 10:00:00', ?, 15);", (title, text, int(author_id[0])))
                # print(text)
        print(f'Processed {line_count} lines.')

