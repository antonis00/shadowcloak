# https://pypi.org/project/enron_reader/
# https://www.cs.cmu.edu/~enron/


# https://r-posts.com/covid-19-posts-a-public-dataset-containing-400-covid-19-blog-posts/

# https://lionbridge.ai/datasets/12-best-social-media-datasets/

# https://www.kaggle.com/kazanova/sentiment140

# https://www.kaggle.com/rtatman/blog-authorship-corpus

import sqlite3
from enron_reader import EnronReader


reader = EnronReader("C:/Users/antonis/Desktop/maildir")

# users = reader.get_user_ids()
# print(users)

mail_senders = ['allen-p','bass-e','buy-r','campbell-l','cuilla-m','dasovich-j','davis-d','delainey-d','derrick-j','donohoe-t','fossum-d','gay-r','haedicke-m','hodge-j','kean-s','keavey-p','king-j','lavorato-j','may-l','mcconnell-m','mckay-b','mclaughlin-e','neal-s','quenet-j','rogers-b','sager-e','scott-s','shively-h','tholt-j','townsend-j','weldon-c','whalley-g','white-s']
for mail_sender in mail_senders:
    
    with sqlite3.connect("C:/Users/antonis/Desktop/files/Stylometry apps/ShadowCloak-BE/shadowcloak/db.sqlite3") as db:
        index = 1
        # print( '\n -------------------' + mail_sender + ' -------------------')
        mailbox = reader.get_mailbox_for_user(mail_sender)
        main_folders = mailbox.root_folder.subfolders

        sent_folder = None

        author = mail_sender.replace("-", " ").lower()
        
        c = db.cursor()
        c.execute('SELECT id FROM stylometry_author WHERE name = (?)', (author,))
        author_id = c.fetchone()

        for folder in main_folders:
            if folder.name == "sent":
                sent_folder = folder
                break

        if sent_folder != None:
            some_messages = sent_folder.messages[:100]
            print(len(some_messages))
            for message in some_messages:
                subject = message.subject
                if message.subject.lower().startswith('re:') or message.subject.lower().startswith('fw:'):
                    continue
                title = str(message.subject) + " (" + author + " " + str(index) + ")"
                document = str(message.plaintext)
                # print("==================== Author: " + author)
                # print("==================== Title: " + title)
                # print("==================== Message: " + document[:10])

                print("title = " + title)
                print("document = " + document)
                c.execute("INSERT INTO stylometry_document (title, description, body, active, publication_date, created_at, updated_at, author_id, group_id) VALUES(?, '', ?, 1, '2002-02-20', '2020-10-14 10:00:00', '2020-10-14 10:00:00', ?, 14);", (title, document, int(author_id[0])))
                index = index + 1
                # c.execute('INSERT INTO stylometry_author (name, description, user_id) values (?, "Enron employee",1);', (author,))


