#!/usr/bin/env python3
"""
Generate sample educational PDFs for Peblo AI testing
"""

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.units import inch
import os

# Output directory
output_dir = '/home/z/my-project/upload'
os.makedirs(output_dir, exist_ok=True)

def create_styles():
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='Title1',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=20,
        alignment=TA_CENTER,
    ))
    
    styles.add(ParagraphStyle(
        name='Heading2Custom',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=12,
    ))
    
    styles.add(ParagraphStyle(
        name='BodyTextCustom',
        parent=styles['BodyText'],
        fontSize=12,
        spaceAfter=10,
        leading=16,
    ))
    
    return styles

def create_grade1_math_pdf():
    """Create Grade 1 Math PDF - Numbers, Counting, and Shapes"""
    doc = SimpleDocTemplate(
        os.path.join(output_dir, 'peblo_pdf_grade1_math_numbers.pdf'),
        pagesize=letter,
        title='Grade 1 Math - Numbers, Counting and Shapes',
        author='Peblo AI'
    )
    
    styles = create_styles()
    story = []
    
    # Title
    story.append(Paragraph('Grade 1 Mathematics', styles['Title1']))
    story.append(Paragraph('Numbers, Counting and Shapes', styles['Heading2Custom']))
    story.append(Spacer(1, 20))
    
    # Section 1: Numbers 1-10
    story.append(Paragraph('Chapter 1: Learning Numbers 1 to 10', styles['Heading2Custom']))
    story.append(Paragraph(
        'Numbers are symbols we use to count things. Let us learn the numbers from 1 to 10. '
        'The number 1 means one thing. When you have one apple, you have 1 apple. '
        'The number 2 means two things. When you have two apples, you have 2 apples. '
        'We can count anything - toys, friends, or fingers on our hands.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'Counting helps us know how many things we have. When we count, we say the numbers in order: '
        '1, 2, 3, 4, 5, 6, 7, 8, 9, 10. Each number is one more than the number before it. '
        'For example, 2 is one more than 1, and 5 is one more than 4. '
        'Practice counting objects around you - count your toys, count the steps you take, or count the birds you see outside.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 15))
    
    # Section 2: Shapes
    story.append(Paragraph('Chapter 2: Basic Shapes', styles['Heading2Custom']))
    story.append(Paragraph(
        'Shapes are all around us! A shape is the form or outline of an object. '
        'Let us learn about some basic shapes that we see every day.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'A circle is a round shape. It has no corners and no sides. '
        'A ball, a clock, and the sun are shaped like circles. '
        'When you draw a circle, you start at one point and go around until you come back to where you started.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'A triangle has three sides and three corners. The three sides can be the same length or different lengths. '
        'A slice of pizza, a traffic sign, and a tent are shaped like triangles. '
        'When three lines meet at three points, they make a triangle.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'A square has four sides that are all the same length. It has four corners, and each corner makes a right angle. '
        'A window, a book, and a tile on the floor can be shaped like squares. '
        'When you fold a piece of paper in half and then in half again, you can see a square shape.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'A rectangle also has four sides and four corners. But unlike a square, only the opposite sides are equal. '
        'A door, a television screen, and a sheet of paper are shaped like rectangles. '
        'A rectangle has two longer sides and two shorter sides.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 15))
    
    # Section 3: Comparing Numbers
    story.append(Paragraph('Chapter 3: Comparing Numbers', styles['Heading2Custom']))
    story.append(Paragraph(
        'We can compare numbers to see which is bigger or smaller. '
        'When we compare two numbers, we can use words like "greater than," "less than," or "equal to." '
        'For example, 5 is greater than 3. This means 5 is more than 3. '
        'We can write this as: 5 > 3. The symbol > means "greater than."',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'When one number is smaller than another, we say it is "less than." '
        'For example, 2 is less than 7. We write this as: 2 < 7. The symbol < means "less than." '
        'When two numbers are the same, we say they are "equal." '
        'For example, 4 is equal to 4. We write this as: 4 = 4. The symbol = means "equal to."',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 15))
    
    # Section 4: Simple Addition
    story.append(Paragraph('Chapter 4: Simple Addition', styles['Heading2Custom']))
    story.append(Paragraph(
        'Addition means putting things together. When we add, we combine two groups to make a bigger group. '
        'The symbol for addition is + (plus). The answer to an addition problem is called the sum. '
        'For example, if you have 2 apples and you get 3 more apples, you now have 5 apples. '
        'We write this as: 2 + 3 = 5. The number 5 is the sum.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'Here are some addition facts to remember: '
        '1 + 1 = 2, 2 + 2 = 4, 3 + 3 = 6, 4 + 4 = 8, 5 + 5 = 10. '
        'These are called doubles. When you add a number to itself, you get a double. '
        'Practice adding numbers using your fingers, toys, or drawings.',
        styles['BodyTextCustom']
    ))
    
    doc.build(story)
    print('Created: peblo_pdf_grade1_math_numbers.pdf')

def create_grade3_science_pdf():
    """Create Grade 3 Science PDF - Plants and Animals"""
    doc = SimpleDocTemplate(
        os.path.join(output_dir, 'peblo_pdf_grade3_science_plants_animals.pdf'),
        pagesize=letter,
        title='Grade 3 Science - Plants and Animals',
        author='Peblo AI'
    )
    
    styles = create_styles()
    story = []
    
    # Title
    story.append(Paragraph('Grade 3 Science', styles['Title1']))
    story.append(Paragraph('Plants and Animals', styles['Heading2Custom']))
    story.append(Spacer(1, 20))
    
    # Section 1: Parts of Plants
    story.append(Paragraph('Chapter 1: Parts of a Plant', styles['Heading2Custom']))
    story.append(Paragraph(
        'Plants are living things that grow in soil. They need sunlight, water, and air to live and grow. '
        'Most plants have several main parts: roots, stem, leaves, flowers, and fruits. '
        'Each part has a special job that helps the plant survive.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'Roots are the part of the plant that grows underground. They hold the plant in the soil and absorb water and minerals. '
        'Some plants have a main root called a taproot, like carrots. Others have many thin roots spreading out in all directions. '
        'Roots also store food for the plant. This is why some roots, like carrots and radishes, are good to eat.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'The stem is the main support of the plant. It carries water and nutrients from the roots to the leaves and flowers. '
        'Stems can be soft and green like in flowers, or hard and woody like in trees. '
        'The stem also holds the leaves up so they can get sunlight.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'Leaves are the food factories of the plant. They use sunlight to make food through a process called photosynthesis. '
        'Leaves are usually green because they contain a substance called chlorophyll. '
        'Leaves also help the plant breathe by taking in carbon dioxide and releasing oxygen.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 15))
    
    # Section 2: Types of Plants
    story.append(Paragraph('Chapter 2: Types of Plants', styles['Heading2Custom']))
    story.append(Paragraph(
        'Plants can be grouped into different types based on their size, shape, and how long they live. '
        'Trees are the largest plants. They have a single woody stem called a trunk. '
        'Trees can live for many years and grow very tall. Examples include oak trees, pine trees, and apple trees.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'Shrubs are smaller than trees but bigger than herbs. They have many woody stems starting from the base. '
        'Shrubs are often used in gardens for decoration. Examples include rose bushes and hibiscus plants. '
        'Herbs are small plants with soft stems. They usually live for one growing season. '
        'Many herbs are used in cooking, like basil, mint, and parsley.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 15))
    
    # Section 3: Animals
    story.append(Paragraph('Chapter 3: Animal Groups', styles['Heading2Custom']))
    story.append(Paragraph(
        'Animals are living things that can move from place to place. Scientists group animals based on their features. '
        'Mammals are animals that have hair or fur and feed their babies with milk. '
        'Dogs, cats, elephants, and whales are all mammals. Humans are mammals too!',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'Birds are animals with feathers, wings, and beaks. Most birds can fly, but some like penguins and ostriches cannot. '
        'Birds lay eggs with hard shells. They are warm-blooded, meaning their body temperature stays the same. '
        'Examples of birds include sparrows, eagles, chickens, and ducks.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'Fish are animals that live in water. They have gills to breathe underwater and fins to help them swim. '
        'Most fish have scales covering their bodies. Fish are cold-blooded, meaning their body temperature changes with the water temperature. '
        'Examples include goldfish, sharks, and salmon.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'Reptiles are cold-blooded animals with dry, scaly skin. They lay eggs with soft shells. '
        'Snakes, lizards, turtles, and crocodiles are reptiles. Most reptiles live on land, but some like sea turtles live in water. '
        'Amphibians are animals that can live both on land and in water. Frogs, toads, and salamanders are amphibians. '
        'They have moist skin and lay eggs in water.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 15))
    
    # Section 4: Habitats
    story.append(Paragraph('Chapter 4: Animal Habitats', styles['Heading2Custom']))
    story.append(Paragraph(
        'A habitat is the natural home of an animal or plant. It provides everything a living thing needs: food, water, shelter, and space. '
        'Different animals live in different habitats. Forest habitats have many trees and are home to deer, squirrels, and owls. '
        'Desert habitats are dry and hot. Animals like camels, lizards, and snakes live here.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'Ocean habitats are filled with salt water. Whales, dolphins, fish, and octopuses live in oceans. '
        'Polar habitats are very cold and covered with ice. Polar bears, penguins, and seals live here. '
        'Animals have special features that help them survive in their habitats. '
        'These features are called adaptations. For example, polar bears have thick fur to stay warm in cold weather.',
        styles['BodyTextCustom']
    ))
    
    doc.build(story)
    print('Created: peblo_pdf_grade3_science_plants_animals.pdf')

def create_grade4_english_pdf():
    """Create Grade 4 English PDF - Grammar and Vocabulary"""
    doc = SimpleDocTemplate(
        os.path.join(output_dir, 'peblo_pdf_grade4_english_grammar.pdf'),
        pagesize=letter,
        title='Grade 4 English - Grammar and Vocabulary',
        author='Peblo AI'
    )
    
    styles = create_styles()
    story = []
    
    # Title
    story.append(Paragraph('Grade 4 English', styles['Title1']))
    story.append(Paragraph('Grammar and Vocabulary', styles['Heading2Custom']))
    story.append(Spacer(1, 20))
    
    # Section 1: Parts of Speech
    story.append(Paragraph('Chapter 1: Parts of Speech', styles['Heading2Custom']))
    story.append(Paragraph(
        'Words are the building blocks of sentences. In English, words are grouped into categories called parts of speech. '
        'The eight main parts of speech are nouns, pronouns, verbs, adjectives, adverbs, prepositions, conjunctions, and interjections. '
        'Understanding parts of speech helps us write clear and correct sentences.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'A noun is a word that names a person, place, thing, or idea. Examples include teacher, school, book, and happiness. '
        'Nouns can be common or proper. Common nouns name general things, while proper nouns name specific things and begin with capital letters. '
        'For example, city is a common noun, but New York is a proper noun.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'A pronoun is a word that takes the place of a noun. Instead of saying "Mary went to Mary house to get Mary book," '
        'we can say "Mary went to her house to get her book." Common pronouns include I, you, he, she, it, we, they, him, her, and them.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'A verb is a word that shows action or state of being. Examples include run, jump, think, is, and are. '
        'Verbs tell what the subject does or what happens to the subject. '
        'Every sentence must have a verb. Without a verb, a group of words cannot be a complete sentence.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'An adjective is a word that describes a noun or pronoun. It tells us what kind, how many, or which one. '
        'In the phrase "the tall tree," the word tall is an adjective describing the tree. '
        'Adjectives make our writing more interesting and specific. Examples include red, happy, three, and beautiful.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 15))
    
    # Section 2: Sentence Structure
    story.append(Paragraph('Chapter 2: Sentence Structure', styles['Heading2Custom']))
    story.append(Paragraph(
        'A sentence is a group of words that expresses a complete thought. Every sentence begins with a capital letter and ends with punctuation. '
        'The main parts of a sentence are the subject and the predicate. '
        'The subject tells who or what the sentence is about. The predicate tells what the subject does or is.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'There are four types of sentences. A declarative sentence makes a statement and ends with a period. '
        'Example: The cat sleeps on the couch. An interrogative sentence asks a question and ends with a question mark. '
        'Example: Where is the cat? An imperative sentence gives a command and ends with a period. '
        'Example: Feed the cat. An exclamatory sentence shows strong emotion and ends with an exclamation point. '
        'Example: What a cute cat!',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 15))
    
    # Section 3: Tenses
    story.append(Paragraph('Chapter 3: Verb Tenses', styles['Heading2Custom']))
    story.append(Paragraph(
        'Verb tenses tell us when an action happens. There are three main tenses: past, present, and future. '
        'The past tense tells about actions that already happened. For most verbs, we add -ed to form the past tense. '
        'Example: Yesterday, I walked to school. Some verbs have irregular past forms. '
        'For example, the past tense of go is went, and the past tense of eat is ate.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'The present tense tells about actions happening now or that happen regularly. '
        'Example: I walk to school every day. The future tense tells about actions that will happen later. '
        'We usually use the helping verb will with the main verb. Example: Tomorrow, I will walk to school. '
        'Understanding tenses helps us communicate when events occur.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 15))
    
    # Section 4: Vocabulary Building
    story.append(Paragraph('Chapter 4: Building Vocabulary', styles['Heading2Custom']))
    story.append(Paragraph(
        'Vocabulary means the words we know and use. Having a strong vocabulary helps us read, write, and speak better. '
        'One way to learn new words is to look for context clues. Context clues are hints in the sentence or paragraph '
        'that help you figure out the meaning of an unknown word.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'Synonyms are words that have similar meanings. For example, big, large, and huge are synonyms. '
        'Antonyms are words with opposite meanings. For example, hot and cold are antonyms. '
        'Using synonyms can make your writing more interesting and prevent repetition. '
        'When writing, try to choose the most precise word for your meaning.',
        styles['BodyTextCustom']
    ))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph(
        'Prefixes and suffixes can help you understand new words. A prefix is added to the beginning of a word. '
        'For example, un- means not, so unhappy means not happy. A suffix is added to the end of a word. '
        'For example, -ful means full of, so helpful means full of help. Learning common prefixes and suffixes '
        'can help you figure out the meanings of hundreds of words.',
        styles['BodyTextCustom']
    ))
    
    doc.build(story)
    print('Created: peblo_pdf_grade4_english_grammar.pdf')

if __name__ == '__main__':
    create_grade1_math_pdf()
    create_grade3_science_pdf()
    create_grade4_english_pdf()
    print('\nAll sample PDFs created successfully!')
