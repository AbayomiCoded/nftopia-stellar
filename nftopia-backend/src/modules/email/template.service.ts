import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

export interface RenderedEmail {
  html: string;
  text: string;
}

/**
 * Compiles and caches the Handlebars templates in ./templates.
 * A plain-text fallback is derived from the rendered HTML rather than
 * maintained as a second template per email — good enough for transactional
 * mail clients that fall back to text/plain.
 */
@Injectable()
export class EmailTemplateService {
  private readonly templatesDir = path.join(__dirname, 'templates');
  private readonly compiled = new Map<string, Handlebars.TemplateDelegate>();

  render(
    templateName: string,
    context: Record<string, unknown>,
  ): RenderedEmail {
    const template = this.getCompiledTemplate(templateName);
    const html = template(context);
    return { html, text: this.htmlToText(html) };
  }

  private getCompiledTemplate(
    templateName: string,
  ): Handlebars.TemplateDelegate {
    const cached = this.compiled.get(templateName);
    if (cached) {
      return cached;
    }

    const filePath = path.join(this.templatesDir, `${templateName}.hbs`);
    const source = fs.readFileSync(filePath, 'utf8');
    const compiled = Handlebars.compile(source);
    this.compiled.set(templateName, compiled);
    return compiled;
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<\/(p|div|h[1-6]|tr|li)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
