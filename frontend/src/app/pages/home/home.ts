import { Component } from '@angular/core';

@Component({
  template: `
    <main class="page">
      <article class="notepaper">
        <p>Stylometry is the statistical analysis of variations in literary style between one writer or genre and another.</p>
        <p>It is often used to attribute authorship to anonymous or disputed documents. It has legal as well as academic and literary applications, ranging from the question of the authorship of Shakespeare's works to forensic linguistics. Stylometric methods are discussed in several academic fields such as machine learning, natural language processing, and lexicography.</p>
        <p>Stylometry can also be an important weapon for governments that want to analyze information on the internet. To be able to identify a suspected activist on the basis of his or her writing, to be able to attribute certain texts, to store the stylistic fingerprints of everybody on the basis of what they write online, or to be able to use these techniques as evidence in a trial only strengthens the surveillance state we now live under.</p>
        <p>This tool is designed to analyze a text's features and attribute it to one of the known authors, the one that has the most similar writing style. Thus, it can be used as a tool to check the real anonymity of a piece of text. In order to find the correct author of course, some of their documents must be inserted into the application so that their writing style can be inferred. The more data we have on an author, the better their writing style can be analyzed. Another feature of this application is the categorization of documents into user defined groups, so that we can search for the author of the disputed text only in the desired group of documents.</p>
        <p>It can also help evade behavioral biometric recognition by copying the text from this tool and pasting it to untrusted websites.</p>
        <p>"Man is least himself when he talks in his own person. Give him a mask, and he will tell you the truth." - Oscar Wilde</p>
      </article>
    </main>
  `,
  styles: `
    .notepaper {
      position: relative;
      padding: 24px 24px 8px 48px;
      border: 1px solid rgb(195 186 170 / 90%);
      background-color: #fefff4;
      box-shadow: inset 0 0 5px #e3e7ae;
      color: #6a5f49;
      font-family: Georgia, serif;
      font-size: 16px;
      line-height: 30px;

      /* The notepad's red margin line. */
      &::before {
        content: '';
        position: absolute;
        inset: 0 auto 0 28px;
        width: 2px;
        border: solid rgb(239 207 173 / 90%);
        border-width: 0 1px;
      }
    }
  `,
})
export class Home {}
