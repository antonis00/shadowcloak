# Acknowledgements
# The corpus may be freely used for non-commercial research purposes. Any resulting publications should cite the following:

# J. Schler, M. Koppel, S. Argamon and J. Pennebaker (2006). Effects of Age and Gender on Blogging in Proceedings of 2006 AAAI Spring Symposium on Computational Approaches for Analyzing Weblogs. URL: http://www.cs.biu.ac.il/~schlerj/schler_springsymp06.pdf


# https://www.kaggle.com/rtatman/blog-authorship-corpus

# id          gender  age     topic       sign    date               text    
# 2059027     male    15      Student    Leo      14,May,2004        Info has been found (+/- 100 pages, and 4.5 MB of .pdf files) Now i have to wait untill o...

import csv
import sqlite3

with open('C:/Users/antonis/Desktop/blogs.csv', encoding="utf8") as csv_file:
    with sqlite3.connect("C:/Users/antonis/Desktop/files/Stylometry apps/ShadowCloak-BE/shadowcloak/db.sqlite3") as db:
        c = db.cursor()
        csv_reader = csv.reader(csv_file, delimiter=',')
        line_count = 0
        author_index = {}
        for row in csv_reader:
            if line_count == 0:
                print(f'Column names are {", ".join(row)}')
                line_count += 1
            else:
                line_count += 1
                if line_count >= 2000 or line_count == 0 or line_count == 1:
                    break
                author = row[0]
                text = row[6]
                # print(f' Author {author} wrote:  {text}')
                c.execute('SELECT id FROM stylometry_author WHERE name = (?)', (author,))
                author_id = c.fetchone()
                # print(author_id)
                if author_id == None:
                    author_index[author] = 1
                    # c.execute('INSERT INTO stylometry_author (name, description, user_id) values (?, "Blog Author",1);', (author,))
                
                if author_id != None:
                    if author not in author_index:
                        author_index[author] = 0
                    author_index[author] += 1
                    title =  str(author) + " " +  str(author_index[author])
                    c.execute("INSERT INTO stylometry_document (title, description, body, active, publication_date, created_at, updated_at, author_id, group_id) VALUES(?, '', ?, 1, '2002-02-20', '2020-10-14 10:00:00', '2020-10-14 10:00:00', ?, 13);", (title, text, int(author_id[0])))
                
        print(f'Processed {line_count} lines.')