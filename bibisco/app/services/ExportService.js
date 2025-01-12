/* eslint-disable indent */
/*
 * Copyright (C) 2014-2022 Andrea Feccomandi
 *
 * Licensed under the terms of GNU GPL License;
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.gnu.org/licenses/gpl-3.0.en.html
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY.
 * See the GNU General Public License for more details.
 *
 */

angular.module('bibiscoApp').service('ExportService', function ($injector, $translate, 
  $rootScope, ArchitectureService, BibiscoPropertiesService, ChapterService, ContextService, 
  DatetimeService, DocxExporterService, FileSystemService, LocaleService, LocationService, MainCharacterService, 
  PdfExporterService, ProjectService, SecondaryCharacterService, StrandService,
  SupporterEditionChecker, TxtExporterService, UtilService) {
  'use strict';

  const { shell } = require('electron');
  let dateFormat = require('dateformat');
  let translations;
  let ObjectService = null;
  let NoteService = null;
  let TimelineService = null;

  const behaviors_questions_count = 12;
  const ideas_questions_count = 18;
  const personaldata_questions_count = 12;
  const physionomy_questions_count = 24;
  const psychology_questions_count = 62;
  const sociology_questions_count = 10;

  $rootScope.$on('LOCALE_CHANGED', function () {
    translations = null;
  });
  
  return {

    exportPdf: function (exportfilter, exportpath, callback) {
      this.export(exportfilter, exportpath, PdfExporterService, callback);
    },

    exportWord: function (exportfilter, exportpath, callback) {
      this.export(exportfilter, exportpath, DocxExporterService, callback);
    },
    
    exportTxt: function (exportfilter, exportpath, callback) {
      this.export(exportfilter, exportpath, TxtExporterService, callback);
    },

    exportArchive: function (exportpath, callback) {
      let archivefilepath = this.calculateExportFilePath(exportpath, 'archive', new Date());
      ProjectService.export(archivefilepath, function () {
        shell.showItemInFolder(exportpath);
        callback();
      });
    },

    calculateExportFilePath: function (exportpath, type, timestamp) {
      let timestampFormatted = dateFormat(timestamp, 'yyyy_mm_dd_HH_MM_ss');
      let name = UtilService.string.slugify(ProjectService.getProjectInfo().name, '_');
      let filename = name + '_' + type + '_' + timestampFormatted;
      return FileSystemService.concatPath(exportpath, filename);
    },
    

    export: function (exportfilter, exportpath, exporter, callback) {

      // init moment
      this.initMoment();

      // chapter title in project language
      let projectLanguage = ProjectService.getProjectInfo().language;
      let translation = JSON.parse(FileSystemService.readFile(this.getResourceFilePath(projectLanguage)));

      // chapter format
      let chapterformat = {
        chaptertitleformat: BibiscoPropertiesService.getProperty('chaptertitleformat'),
        chaptertitleinprojectlanguage: translation.common_chapter,
        chapterpositionstyle: this.calculateChapterPositionStyle(),
        sceneseparator: this.calculateSceneSeparator()
      };

      // export timestamp
      let timestamp = new Date();

      // files to export
      let files2export = [];

      // novel
      if (exportfilter.id === 'novel_project' || exportfilter.id === 'novel' || exportfilter.id === 'project') {
        if (exportfilter.id === 'novel_project' || exportfilter.id === 'novel') {
          files2export.push({
            filepath:  this.calculateExportFilePath(exportpath, 'novel', timestamp),
            html: this.createNovelHtml(chapterformat),
            exportconfig: this.calculateExportConfig({
              hcountingactive: false,
              pagebreakonh1: true
            })
          });
        }
        if (exportfilter.id === 'novel_project' || exportfilter.id === 'project') {
          files2export.push({
            filepath:  this.calculateExportFilePath(exportpath, 'project', timestamp),
            html: this.createProjectHtml(),
            exportconfig: this.calculateExportConfig({
              hcountingactive: true,
              pagebreakonh1: true
            })
          });
        }
      } 
      // prologue
      else if (exportfilter.type === 'prologue') {
        let chapter = ChapterService.getChapter(exportfilter.id);
        files2export.push({
          filepath:  this.calculateExportFilePath(exportpath, 'chapter', timestamp),
          html: this.createChapter({
            chapter: chapter,
            chapterformat: chapterformat,
            tag: 'prologue',
            ignoretitleformat: true
          }),
          exportconfig: this.calculateExportConfig({
            hcountingactive: false,
            pagebreakonh1: false
          })
        });
      }
      // epilogue
      else if (exportfilter.type === 'epilogue') {
        let chapter = ChapterService.getChapter(exportfilter.id);
        files2export.push({
          filepath:  this.calculateExportFilePath(exportpath, 'chapter', timestamp),
          html: this.createChapter({
            chapter: chapter,
            chapterformat: chapterformat,
            tag: 'epilogue',
            ignoretitleformat: true
          }),
          exportconfig: this.calculateExportConfig({
            hcountingactive: false,
            pagebreakonh1: false
          })
        });
      }
      // chapter
      else if (exportfilter.type === 'chapter') {
        let chapter = ChapterService.getChapter(exportfilter.id);
        files2export.push({
          filepath:  this.calculateExportFilePath(exportpath, 'chapter', timestamp),
          html: this.createChapter({
            chapter: chapter,
            chapterformat: chapterformat,
            tag: 'h1'
          }),
          exportconfig: this.calculateExportConfig({
            hcountingactive: false,
            pagebreakonh1: false
          })
        });
      }
      // architecture
      else if (exportfilter.id === 'architecture') {
        files2export.push({
          filepath:  this.calculateExportFilePath(exportpath, 'architecture', timestamp),
          html: this.createArchitecture(),
          exportconfig: this.calculateExportConfig({
            hcountingactive: false,
            pagebreakonh1: false
          })
        });
      } 
      // strands
      else if (exportfilter.id === 'strands') {
        files2export.push({
          filepath:  this.calculateExportFilePath(exportpath, 'strands', timestamp),
          html: this.createStrands(),
          exportconfig: this.calculateExportConfig({
            hcountingactive: false,
            pagebreakonh1: false
          })
        });
      } 
      // main character
      else if (exportfilter.type === 'maincharacter') {
        files2export.push({
          filepath: this.calculateExportFilePath(exportpath, 'maincharacter', timestamp),
          html: this.createMainCharacters(exportfilter.id),
          exportconfig: this.calculateExportConfig({
            hcountingactive: false,
            pagebreakonh1: false
          })
        });
      }
      // secondary character
      else if (exportfilter.type === 'secondarycharacter') {
        files2export.push({
          filepath: this.calculateExportFilePath(exportpath, 'secondarycharacter', timestamp),
          html: this.createSecondaryCharacters(exportfilter.id),
          exportconfig: this.calculateExportConfig({
            hcountingactive: false,
            pagebreakonh1: false
          })
        });
      }
      // location
      else if (exportfilter.type === 'location') {
        files2export.push({
          filepath: this.calculateExportFilePath(exportpath, 'location', timestamp),
          html: this.createLocations(exportfilter.id),
          exportconfig: this.calculateExportConfig({
            hcountingactive: false,
            pagebreakonh1: false
          })
        });
      }
      // object
      else if (exportfilter.type === 'object') {
        files2export.push({
          filepath: this.calculateExportFilePath(exportpath, 'object', timestamp),
          html: this.createObjects(exportfilter.id),
          exportconfig: this.calculateExportConfig({
            hcountingactive: false,
            pagebreakonh1: false
          })
        });
      }
      // note
      else if (exportfilter.type === 'note') {
        files2export.push({
          filepath: this.calculateExportFilePath(exportpath, 'note', timestamp),
          html: this.createNotes(exportfilter.id),
          exportconfig: this.calculateExportConfig({
            hcountingactive: false,
            pagebreakonh1: false
          })
        });
      }
      // timeline
      else if (exportfilter.id === 'timeline') {
        files2export.push({
          filepath: this.calculateExportFilePath(exportpath, 'timeline', timestamp),
          html: this.createTimeline(),
          exportconfig: this.calculateExportConfig({
            hcountingactive: false,
            pagebreakonh1: false
          })
        });
      }

      exporter.export(files2export[0], function () {
        if (files2export.length === 2) {
          exporter.export(files2export[1], function () {
            shell.showItemInFolder(exportpath);
            callback();
          });
        } else {
          shell.showItemInFolder(exportpath);
          callback();
        }
      });
    },

    getFont: function () {
      let font;
      let fontProperty = BibiscoPropertiesService.getProperty('font');
      switch (fontProperty) {
        case 'arial':
          font = 'Arial';
          break;
        case 'baskerville':
          font = 'Baskerville';
          break;
        case 'courier':
          font = 'Courier';
          break;
        case 'garamond':
          font = 'Garamond';
          break;
        case 'georgia':
          font = 'Georgia';
          break;
        case 'palatino':
          font = 'Palatino';
          break;
        case 'times':
          font = 'Times New Roman';
          break;
        default:
          break;
      }

      return font;
    },

    createProjectHtml: function () {
      
      let isSupporterOrTrial = SupporterEditionChecker.isSupporterOrTrial();
      
      let html = '';
      html += this.createAuthor();
      html += this.createTitle();
      html += this.createProjectSubtitle();
      html += this.createArchitecture();
      html += this.createStrands();
      html += this.createMainCharacters();
      html += this.createSecondaryCharacters();
      html += this.createLocations();
      if (isSupporterOrTrial) {
        html += this.createObjects();
        html += this.createNotes();
      }
      html += this.createChaptersForProject();
      if (isSupporterOrTrial) {
        html += this.createTimeline();
      }

      // remove double white spaces
      html = html.replace(/&nbsp;/g, ' ');
      html = html.replace(/  +/g, ' ');
      
      return html;
    },

    createNovelHtml: function(chapterformat) {
      let html = '';

      html += this.createAuthor();
      html += this.createTitle();
      html += this.createNovelSubtitle();
      html += this.createChaptersForNovel(chapterformat);

      // remove double white spaces
      html = html.replace(/&nbsp;/g, ' ');
      html = html.replace(/  +/g, ' ');

      return html;
    },

    createTitle: function() {
      return this.createTag('exporttitle', ProjectService.getProjectInfo().name);
    },

    createAuthor: function() {
      return this.createTag('exportauthor', ProjectService.getProjectInfo().author);
    },

    createNovelSubtitle: function () {
      return this.createTag('exportsubtitle', '');
    },

    createProjectSubtitle: function () {
      return this.createTag('exportsubtitle', this.getTranslations().export_project_subtitle);
    },

    createArchitecture: function () {
      let html = '';

      html += this.createTag('h1', this.getTranslations().common_architecture);

      // premise
      html += this.createTag('h2', this.getTranslations().common_premise);
      html += ArchitectureService.getPremise().text;

      // fabula
      html += this.createTag('h2', this.getTranslations().common_fabula);
      html += ArchitectureService.getFabula().text;

      // settings
      html += this.createTag('h2', this.getTranslations().common_setting);
      html += ArchitectureService.getSetting().text;
      html += this.createEvents('architecture', 'setting');

      // global notes
      if (SupporterEditionChecker.isSupporterOrTrial()) {
        html += this.createTag('h2', this.getTranslations().common_notes_title);
        html += ArchitectureService.getGlobalNotes().text;
      }
    
      return html;
    },

    createStrands: function () {
      let html = '';

      // strands
      let strands = StrandService.getStrands();
      if (strands && strands.length > 0) {
        html += this.createTag('h1', this.getTranslations().common_strands);
        for (let i = 0; i < strands.length; i++) {
          html += this.createTag('h2', strands[i].name);
          html += strands[i].description;
        }
      }
    
      return html;
    },

    createMainCharacters: function (filter) {
      let html = '';

      let mainCharacters = MainCharacterService.getMainCharacters();
      if (mainCharacters && mainCharacters.length > 0) {
        html += this.createTag('h1', this.getTranslations().common_main_characters);
        for (let i = 0; i < mainCharacters.length; i++) {
          if (!filter || (filter && mainCharacters[i].$loki === filter)) {
            html += this.createMainCharacter(mainCharacters[i]);     
          }     
        }
      }

      return html;
    },

    createMainCharacter: function (mainCharacter) {
      let html = '';
      // mainCharacters[i].$loki
      html += this.createTag('h2', mainCharacter.name);
      html += this.createMainCharacterInfoWithQuestions(mainCharacter, 'personaldata', personaldata_questions_count);
      html += this.createMainCharacterInfoWithQuestions(mainCharacter, 'physionomy', physionomy_questions_count);
      html += this.createMainCharacterInfoWithQuestions(mainCharacter, 'behaviors', behaviors_questions_count);
      html += this.createMainCharacterInfoWithQuestions(mainCharacter, 'psychology',psychology_questions_count);
      html += this.createMainCharacterInfoWithQuestions(mainCharacter, 'ideas', ideas_questions_count);
      html += this.createMainCharacterInfoWithQuestions(mainCharacter, 'sociology', sociology_questions_count);
      html += this.createMainCharacterInfoWithoutQuestions(mainCharacter, 'lifebeforestorybeginning');
      html += this.createMainCharacterInfoWithoutQuestions(mainCharacter, 'conflict');
      html += this.createMainCharacterInfoWithoutQuestions(mainCharacter, 'evolutionduringthestory');
      html += this.createEvents('maincharacter', mainCharacter.$loki);
      return html;
    },

    createMainCharacterInfoWithQuestions: function (mainCharacter, info, questionsCount) {
      
      let html = '';
      html += this.createTag('h3', this.getTranslations()['common_' + info]);
      
      // freetext
      if (mainCharacter[info].freetextenabled) {
        html += mainCharacter[info].freetext;
      } 
      // questions
      else {
        for (let i = 0; i < questionsCount; i++) {
          let question = '(' + (i+1) + '/' + questionsCount + ') ' + this.getTranslations()['characterInfo_question_' + info + '_' + i];
          html += this.createTag('question', question);   
          html += mainCharacter[info].questions[i].text;
        }
      }
      return html;
    },

    createMainCharacterInfoWithoutQuestions: function (mainCharacter, info) {
      let html = '';
      html += this.createTag('h3', this.getTranslations()['common_characters_' + info]);
      html += mainCharacter[info].text;
      return html; 
    },

    createSecondaryCharacters: function(filter) {
      let html = '';
      let secondaryCharacters = SecondaryCharacterService.getSecondaryCharacters();
      if (secondaryCharacters && secondaryCharacters.length > 0) {
        html += this.createTag('h1', this.getTranslations().common_secondary_characters);
        for (let i = 0; i < secondaryCharacters.length; i++) {
          if (!filter || (filter && secondaryCharacters[i].$loki === filter)) {
            html += this.createTag('h2', secondaryCharacters[i].name);
            html += secondaryCharacters[i].description;
            html += this.createEvents('secondarycharacter', secondaryCharacters[i].$loki);
          }
        }
      }
      return html;
    },

    createLocations: function(filter) {
      let html = '';
      let locations = LocationService.getLocations();
      if (locations && locations.length > 0) {
        html += this.createTag('h1', this.getTranslations().common_locations);
        for (let i = 0; i < locations.length; i++) {
          if (!filter || (filter && locations[i].$loki === filter)) {
            html += this.createTag('h2', LocationService.calculateLocationName(locations[i]));
            html += locations[i].description;
            html += this.createEvents('location', locations[i].$loki);
          }
        }
      }
      return html;
    },

    createObjects: function (filter) {
      let html = '';
      let objects = this.getObjectService().getObjects();
      if (objects && objects.length > 0) {
        html += this.createTag('h1', this.getTranslations().objects);
        for (let i = 0; i < objects.length; i++) {
          if (!filter || (filter && objects[i].$loki === filter)) {
            html += this.createTag('h2', objects[i].name);
            html += objects[i].description;
            html += this.createEvents('object', objects[i].$loki);
          }
        }
      }
      return html;
    },

    createNotes: function (filter) {
      let html = '';
      let notes = this.getNoteService().getNotes();
      if (notes && notes.length > 0) {
        html += this.createTag('h1', this.getTranslations().common_notes_title);
        for (let i = 0; i < notes.length; i++) {
          if (!filter || (filter && notes[i].$loki === filter)) {
            html += this.createTag('h2', notes[i].name);
            html += notes[i].description;
          }
        }
      }
      return html;
    },

    createChaptersForProject: function () {
      let html = '';

      let chapters = ChapterService.getChaptersWithPrologueAndEpilogue();
      if (chapters && chapters.length > 0) {
        html += this.createTag('h1', this.getTranslations().common_chapters);
        for (let i = 0; i < chapters.length; i++) {
          html += this.createTag('h2', ChapterService.getChapterPositionDescription(chapters[i].position) + ' ' + chapters[i].title);
          html += this.createTag('h3', this.getTranslations().common_chapter_reason);
          html += chapters[i].reason.text;
          html += this.createTag('h3', this.getTranslations().common_chapter_notes);
          html += chapters[i].notes.text;
        }
      }
      return html;
    },

    createChaptersForNovel: function (chapterformat) {
      let html = '';
      
      // prologue
      let prologue = ChapterService.getPrologue();
      if (prologue) {
        html += this.createChapter({
          chapter: prologue,
          chapterformat: chapterformat,
          tag: 'prologue',
          ignoretitleformat: true
        });
      }
      
      // chapters and parts
      let chapters = ChapterService.getChapters();
      let partsEnabled = ChapterService.getPartsCount()>0 ? true : false;
      let parts = ChapterService.getParts();

      let lastPart = -1;
      let partLastChapterPosition = null;
      if (chapters && chapters.length > 0) {
        for (let i = 0; i < chapters.length; i++) {
          if (partsEnabled && (lastPart===-1 || chapters[i].position>partLastChapterPosition)) {
            lastPart += 1;
            partLastChapterPosition = ChapterService.getPartLastChapterPosition(parts[lastPart].$loki);
            html += this.createTag('parttitle', parts[lastPart].title);
          } 

          html += this.createChapter({
            chapter: chapters[i],
            chapterformat: chapterformat,
            tag: 'h1'
          });
        }
      }

      // epilogue
      let epilogue = ChapterService.getEpilogue();
      if (epilogue) {
        html += this.createChapter({
          chapter: epilogue,
          chapterformat: chapterformat,
          tag: 'epilogue',
          ignoretitleformat: true
        });
      }

      return html;
    },

    calculateChapterPositionStyle: function() {
      let chapterpositionstyle;
      switch (BibiscoPropertiesService.getProperty('chaptertitleposition')) {
        case 'left':
          chapterpositionstyle = 'text-align: left';
          break;
        case 'center':
          chapterpositionstyle = 'text-align: center';
          break;
      }
      return chapterpositionstyle;
    },

    calculateSceneSeparator: function() {
      let sceneseparator;
      switch (BibiscoPropertiesService.getProperty('sceneseparator')) {
        case 'blank_line':
          sceneseparator = '';
          break;
        case 'three_asterisks':
          sceneseparator = '***';
          break;
        case 'three_dots':
          sceneseparator = '...';
          break;
      }
      return sceneseparator;
    },

    calculateExportConfig: function(exportParams) {
      return {
        font: this.getFont(),
        indent: (BibiscoPropertiesService.getProperty('indentParagraphEnabled') === 'true'),
        linespacing: BibiscoPropertiesService.getProperty('linespacing'),
        paragraphspacing: BibiscoPropertiesService.getProperty('paragraphspacing'),
        hcountingactive: exportParams.hcountingactive,
        pagebreakonh1: exportParams.pagebreakonh1,
        title:  ProjectService.getProjectInfo().name,
        author:  ProjectService.getProjectInfo().author
      };
    },

    createChapter: function (chapterconfig) {

      let chapter = chapterconfig.chapter;
      let title = chapterconfig.ignoretitleformat ? chapter.title : this.calculateChapterTitle(chapterconfig.chapterformat.chaptertitleformat, chapter.title, chapter.position, chapterconfig.chapterformat.chaptertitleinprojectlanguage);
      let html = this.createTag(chapterconfig.tag, title, [{ name: 'style', value: chapterconfig.chapterformat.chapterpositionstyle }]);
      let scenes = ChapterService.getScenes(chapter.$loki);
      for (let j = 0; j < scenes.length; j++) {
        html += scenes[j].revisions[scenes[j].revision].text;
        if (j < scenes.length - 1) {
          html += this.createTag('p', chapterconfig.chapterformat.sceneseparator, [{ name: 'style', value: 'text-align: center' }]);
        }
      }

      return html;
    },

    calculateChapterTitle: function(chaptertitleformat, title, position, chaptertitleinprojectlanguage) {
      let chaptertitle;
      switch (chaptertitleformat) {
        case 'numbertitle':
          chaptertitle = position + '. ' + title; 
          break;
        case 'number':
          chaptertitle = position;
          break;
        case 'title':
          chaptertitle = title;
          break;
        case 'labelnumber':
          chaptertitle = chaptertitleinprojectlanguage + ' ' + position;
          break;
      }
      return chaptertitle;
    },

    createEvents: function(type, id) {
      let html = '';
      if (SupporterEditionChecker.isSupporterOrTrial()) {
        let timelineHtml = '';
        let timeline = this.getTimelineService().getTimeline({type: type, id: id});
  
        if (timeline && timeline.length > 0) {
          html += this.createTag('h3', this.getTranslations().common_events); 
          for (let i = 0; i < timeline.length; i++) {
            timelineHtml += this.createTag('li', 
              this.createTag('b', this.createTimelineDatetime(timeline[i]))
              + ' - ' 
              + timeline[i].title
            );  
          }
          html += this.createTag('ul', timelineHtml); 
        }
      }
      return html;
    },

    createTimeline: function () {
      let html = '';
      let timelineHtml = '';
      let timeline = this.getTimelineService().getTimeline();

      if (timeline && timeline.length > 0) {
        html += this.createTag('h1', this.getTranslations().timeline_title); 
        for (let i = 0; i < timeline.length; i++) {
          timelineHtml += this.createTag('li', 
            this.createTag('b', this.createTimelineDatetime(timeline[i]))
            + ' - ' 
            + this.createTimelineDescription(timeline[i])
          );  
        }
        html += this.createTag('ul', timelineHtml); 
      }
      return html;
    },

    createTimelineDatetime: function(timelineElement) {
      let html = '';
      
      if (timelineElement.time && timelineElement.timegregorian) {
        html += moment(timelineElement.time).format('dddd') + ' ' +
        moment(timelineElement.time).format(this.getTranslations().date_format_export_timeline) +
        DatetimeService.calculateYear(new Date(timelineElement.time)) + ' ' +
        moment(timelineElement.time).format(this.getTranslations().time_format_export_timeline);
      } 
      else if (timelineElement.time && !timelineElement.timegregorian) {
        html += timelineElement.time;
      }
      else if (!timelineElement.time) {
        html += this.getTranslations().noinfoavailable;
      }

      return html;
    },

    createTimelineDescription: function(timelineElement) {

      let html = '';
      
      html += timelineElement.title;
      html += ' ';

      html += '(';
      if (timelineElement.type === 'scene') {
        html += this.createTag('i', this.getTranslations().common_chapter);
        html += ': ';
        html += ChapterService.getChapterPositionDescription(timelineElement.chapterposition);
        if (timelineElement.chaptertitle) {
          html += ' ' + timelineElement.chaptertitle;
        }
        if (timelineElement.characters) {
          html += ', ';
          html += this.createTag('i', this.getTranslations().common_characters);
          html += ': ' + timelineElement.characters;
        }
        if (timelineElement.locationname) {
          html += ', ';
          html += this.createTag('i', this.getTranslations().common_location); 
          html += ': ' + timelineElement.locationname;
        }  
        if (timelineElement.objects) {
          html += ', ';
          html += this.createTag('i', this.getTranslations().objects);
          html += ': ' + timelineElement.objects;
        }
      } 
      
      else if (timelineElement.type === 'architecture') {
        html += this.createTag('i', this.getTranslations().common_setting);
      } 
      
      else if (timelineElement.type === 'maincharacter' || timelineElement.type === 'secondarycharacter') {
        html += this.createTag('i', this.getTranslations().common_character);
        html += ': ' + timelineElement.description;
      } 
      
      else if (timelineElement.type === 'location') {
        html += this.createTag('i', this.getTranslations().common_location);
        html += ': ' + timelineElement.description;
      } 
      
      else if (timelineElement.type === 'object') {
        html += this.createTag('i', this.getTranslations().object);
        html += ': ' + timelineElement.description;
      }

      html += ')';

      return html;
    },

    createTag: function(tagname, content, attribs) {
      let html = '';
      html += '<' + tagname;
      if (attribs && attribs.length > 0) {
        for (let i = 0; i < attribs.length; i++) {
          html += ' ';
          html += attribs[i].name;
          html += '= "';
          html += attribs[i].value;
          html += '"';
        }
      } 
      html += '>';
      html += content;
      html += '</' + tagname + '>';
      return html;
    },

    loadTranslations: function() {
      
      let translationkeys = [
        'chapter_title_format_example_title',
        'common_architecture',
        'common_behaviors',
        'common_chapter_notes',
        'common_chapter_reason',
        'common_chapter',
        'common_chapters',
        'common_character',
        'common_characters',
        'common_characters_conflict',
        'common_characters_evolutionduringthestory',
        'common_characters_lifebeforestorybeginning',
        'common_events',
        'common_fabula',
        'common_ideas',
        'common_location',
        'common_notes_title',
        'common_locations',
        'common_main_characters',
        'common_personaldata',
        'common_physionomy',
        'common_premise',
        'common_psychology',
        'common_secondary_characters',
        'common_setting',
        'common_sociology',
        'common_strands',
        'export_project_subtitle',
        'noinfoavailable',
        'object',
        'objects',
        'date_format_export_timeline',
        'time_format_export_timeline',
        'timeline_title'];

      translationkeys.push.apply(translationkeys, 
        this.addInfoQuestionsTranslationKeys('behaviors', behaviors_questions_count));
      translationkeys.push.apply(translationkeys,
        this.addInfoQuestionsTranslationKeys('ideas', ideas_questions_count));
      translationkeys.push.apply(translationkeys,
        this.addInfoQuestionsTranslationKeys('personaldata', personaldata_questions_count));
      translationkeys.push.apply(translationkeys,
        this.addInfoQuestionsTranslationKeys('physionomy', physionomy_questions_count));
      translationkeys.push.apply(translationkeys,
        this.addInfoQuestionsTranslationKeys('psychology', psychology_questions_count));
      translationkeys.push.apply(translationkeys,
        this.addInfoQuestionsTranslationKeys('sociology', sociology_questions_count));

      translations = $translate.instant(translationkeys);
    },

    addInfoQuestionsTranslationKeys: function(info, questionNumber) {
      let infoQuestionsTranslationKeys = [];
      for (let i = 0; i < questionNumber; i++) {    
        infoQuestionsTranslationKeys.push('characterInfo_question_' + info + '_' + i);
      }
      return infoQuestionsTranslationKeys;
    },

    getObjectService: function () {
      if (!ObjectService) {
        ObjectService = $injector.get('ObjectService');
      }
      return ObjectService;
    },

    getNoteService: function () {
      if (!NoteService) {
        NoteService = $injector.get('NoteService');
      }
      return NoteService;
    },

    getTimelineService: function () {
      if (!TimelineService) {
        TimelineService = $injector.get('TimelineService');
      }
      return TimelineService;
    },

    getTranslations: function() {
      if (!translations) {
        this.loadTranslations();
      }
      return translations;
    },

    initMoment: function() {
      moment.locale(LocaleService.getCurrentLocale());
    },

    calculateChapterTitleExample: function(chaptertitleformat) {

      let chaptertitleexample;
      switch (chaptertitleformat) {
      case 'numbertitle':
        chaptertitleexample = '4. ' + this.getTranslations().chapter_title_format_example_title;
        break;
      case 'number':
        chaptertitleexample = '4';
        break;
      case 'labelnumber':
        let projectLanguage = ProjectService.getProjectInfo().language;
        let translation = JSON.parse(FileSystemService.readFile(this.getResourceFilePath(projectLanguage)));
        chaptertitleexample = translation.common_chapter + ' 4';
        break;
      case 'title':
        chaptertitleexample = this.getTranslations().chapter_title_format_example_title;
        break;
      }
  
      return chaptertitleexample;
    },

    getResourceFilePath: function(language) {

      let resourceSuffix = 'en';
      if (language === 'ca-es') {
        resourceSuffix = 'ca-es';
      } else if (language === 'cs') {
        resourceSuffix = 'cs';
      } else if (language === 'da-dk') {
        resourceSuffix = 'da-dk';
      } else if (language === 'de') {
        resourceSuffix = 'de';
      } else if (language.startsWith('es')) {
        resourceSuffix = 'es';
      } else if (language === 'fr') {
        resourceSuffix = 'fr';
      } else if (language === 'it') {
        resourceSuffix = 'it';
      } else if (language === 'nb-no') {
        resourceSuffix = 'no';
      } else if (language === 'nl') {
        resourceSuffix = 'nl';
      } else if (language === 'pl') {
        resourceSuffix = 'pl';
      } else if (language === 'ru') {
        resourceSuffix = 'ru';
      } else if (language === 'sr') {
        resourceSuffix = 'sr';
      } else if (language === 'sv') {
        resourceSuffix = 'sv';
      } else if (language === 'tr') {
        resourceSuffix = 'tr';
      } else if (language === 'pt-pt') {
        resourceSuffix = 'pt-pt';
      } else if (language === 'pt-br') {
        resourceSuffix = 'pt-br';
      } 

      let resourcesDirPath = FileSystemService.concatPath(ContextService.getAppPath(), 'resources');
      let resourcesFilePath = FileSystemService.concatPath(resourcesDirPath, 'locale-'+resourceSuffix+'.json');

      return resourcesFilePath;
    },
  };
});
